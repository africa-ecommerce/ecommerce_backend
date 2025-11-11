// controllers/plug/getPlugEarnings.ts
import { NextFunction, Response } from "express";
import { paystackSecretKey, prisma } from "../config";
import { AuthRequest } from "../types"; // Assuming this exists
import { PaymentStatus } from "@prisma/client";
import { getReturnDaysLeft } from "../helper/helperFunc";
import crypto from "crypto";
import { withdrawalVerificationMail } from "../helper/mail/payment/withdrawalVerificationMail";

export async function resolveAccountWithBank(req: AuthRequest, res: Response, next: NextFunction) {
  const account_number = (req.body.account_number || "").trim();
  const bank_code = (req.body.bank_code || "").trim();
  const user = req.user!;
  if (!account_number || !bank_code) {
    res.status(400).json({
      success: false,
      error: "Missing or invalid field data!",
    });
    return;
  }
  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.status && data.data) {
      // Create new token
      const newToken = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await prisma.withdrawalVerificationToken.create({
        data: {
          userId: user.id,
          token: newToken,
          expires,
        },
      });

      await withdrawalVerificationMail(user.email, newToken);
      res.status(200).json({
        success: true,
        accountName: data.data.account_name,
        accountNumber: data.data.account_number,
        message: "Verification code sent to your email!",
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: "Unable to resolve account!",
        accountName: "",
        accountNumber: "",
      });
      return;
    }
  } catch (error) {
    next(error);
  }
}

export async function resendWithdrawalVerificationToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const user = req.user!;
  try {
    const now = new Date();

    // Find valid token if exists
    const existing = await prisma.withdrawalVerificationToken.findFirst({
      where: {
        userId: user.id,
        expires: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await withdrawalVerificationMail(user.email, existing.token);
      res.status(200).json({
        success: true,
        message: "Verification code sent to your email!",
      });
      return;
    }

    // Delete expired ones
    await prisma.withdrawalVerificationToken.deleteMany({
      where: {
        userId: user.id,
        expires: { lte: now },
      },
    });

    // Create new token
    const newToken = crypto.randomInt(100000, 1000000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.withdrawalVerificationToken.create({
      data: {
        userId: user.id,
        token: newToken,
        expires,
      },
    });

    await withdrawalVerificationMail(user.email, newToken);
    res.status(200).json({
      success: true,
      message: "Verification code sent to your email!",
    });
    return;
  } catch (error) {
    next(error);
  }
}
export async function processWithdrawal(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const { account_number, bank_code, token, account_name } = req.body;

  try {
    const userId = req.user?.id;
    const plugId = req.user?.plug?.id;
    const supplierId = req.user?.supplier?.id;
    const now = new Date();

    if (!token || !account_number || !bank_code || !account_name) {
      res.status(400).json({ error: "Missing or invalid fields!" });
      return;
    }

    if (!plugId && !supplierId) {
      res.status(403).json({ error: "Unauthorized!" });
      return;
    }

    // ✅ Validate token
    const withdrawalToken = await prisma.withdrawalVerificationToken.findFirst({
      where: {
        token,
        userId,
        expires: { gt: now },
      },
    });

    if (!withdrawalToken) {
      res.status(400).json({ error: "Token is invalid or has expired!" });
      return;
    }

    // ✅ Compute available withdrawal amount
    let withdrawalAmount = 0;

    if (plugId) {
      const plugPayments = await prisma.plugPayment.aggregate({
        _sum: { amount: true },
        where: { plugId, status: PaymentStatus.UNPAID },
      });
      withdrawalAmount = plugPayments._sum.amount || 0;
    }

    if (supplierId) {
      const supplierPayments = await prisma.supplierPayment.aggregate({
        _sum: { amount: true },
        where: { supplierId, status: PaymentStatus.UNPAID },
      });
      withdrawalAmount = supplierPayments._sum.amount || 0;
    }

    if (Number(withdrawalAmount) <= 0) {
      res.status(400).json({ error: "No funds available for withdrawal!" });
      return;
    }

    // ✅ Create Paystack recipient
    const recipientResponse = await fetch(
      "https://api.paystack.co/transferrecipient",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: account_name,
          account_number,
          bank_code,
          currency: "NGN",
        }),
      }
    );

    const recipientData = await recipientResponse.json();
    if (!recipientData.status || !recipientData.data?.recipient_code) {
      console.error("Paystack recipient error:", recipientData);
      res.status(500).json({ error: "Failed to create transfer recipient!" });
      return;
    }

    // ✅ Initiate Paystack transfer
    const transferResponse = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(withdrawalAmount * 100),
        recipient: recipientData.data.recipient_code,
        reason: plugId
          ? "Plug withdrawal"
          : supplierId
          ? "Supplier withdrawal"
          : "Withdrawal",
      }),
    });

    const transferData = await transferResponse.json();
    const transferSuccess =
      transferData?.status && transferData?.data?.reference;
    const reference = transferSuccess ? transferData.data.reference : "";

    // ✅ Handle failed transfer
    if (!transferSuccess) {
      if (plugId) {
        await prisma.plugWithdrawalHistory.create({
          data: {
            plugId,
            amount: withdrawalAmount,
            reference,
            status: "FAILED",
          },
        });
      }
      if (supplierId) {
        await prisma.supplierWithdrawalHistory.create({
          data: {
            supplierId,
            amount: withdrawalAmount,
            reference,
            status: "FAILED",
          },
        });
      }

      res.status(500).json({ error: "Withdrawal failed!" });
      return;
    }

    // ✅ Update DB atomically
    const tx: any[] = [];

    if (plugId) {
      tx.push(
        prisma.plugPayment.updateMany({
          where: { plugId, status: PaymentStatus.UNPAID },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        })
      );
    }

    if (supplierId) {
      tx.push(
        prisma.supplierPayment.updateMany({
          where: { supplierId, status: PaymentStatus.UNPAID },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        })
      );
    }

    tx.push(
      prisma.withdrawalVerificationToken.delete({
        where: { id: withdrawalToken.id },
      })
    );

    await prisma.$transaction(tx);

    // ✅ Log successful withdrawal
    if (plugId) {
      await prisma.plugWithdrawalHistory.create({
        data: {
          plugId,
          amount: withdrawalAmount,
          reference,
          status: "SUCCESS",
        },
      });
    }

    if (supplierId) {
      await prisma.supplierWithdrawalHistory.create({
        data: {
          supplierId,
          amount: withdrawalAmount,
          reference,
          status: "SUCCESS",
        },
      });
    }

    res.status(200).json({
      message: "Withdrawal processed successfully!",
    });
    return;
  } catch (error) {
    next(error);
  }
}

export async function getPlugPayment(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const plugId = req.plug?.id;
    if (!plugId) {
      res.status(403).json({ error: "Unauthorized!" });
      return;
    }

    const [unpaid, paid] = await Promise.all([
      prisma.plugPayment.aggregate({
        _sum: { amount: true },
        where: { plugId, status: PaymentStatus.UNPAID },
      }),
      prisma.plugPayment.aggregate({
        _sum: { amount: true },
        where: { plugId, status: PaymentStatus.PAID },
      }),
    ]);

    const unPaidAmount = unpaid._sum.amount || 0;
    const paidAmount = paid._sum.amount || 0;
    const totalEarnings = unPaidAmount + paidAmount;

    res.status(200).json({
      message: "Plug payments fetched successfully!",
      data: {
        unPaidAmount,
        totalEarnings,
      },
    });
    return;
  } catch (error) {
    next(error);
  }
}


export async function getSupplierPayment(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const supplierId = req.supplier?.id;
    if (!supplierId) {
      res.status(403).json({ error: "Unauthorized!" });
      return;
    }

    const [unpaid, paid] = await Promise.all([
      prisma.supplierPayment.aggregate({
        _sum: { amount: true },
        where: { supplierId, status: PaymentStatus.UNPAID },
      }),
      prisma.supplierPayment.aggregate({
        _sum: { amount: true },
        where: { supplierId, status: PaymentStatus.PAID },
      }),
    ]);

    const unPaidAmount = unpaid._sum.amount || 0;
    const paidAmount = paid._sum.amount || 0;
    const totalEarnings = unPaidAmount + paidAmount;

    res.status(200).json({
      message: "Supplier payments fetched successfully!",
      data: {
        unPaidAmount,
        totalEarnings,
      },
    });
    return;
  } catch (error) {
    next(error);
  }
}


