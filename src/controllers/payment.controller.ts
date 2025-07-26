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
export async function processWithdrawal(req: AuthRequest, res: Response, next: NextFunction) {
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

    // Validate token
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

    let withdrawalAmount;

    if (plugId) {
      const [plugPayments, resolvePlugPayments] = await Promise.all([
        prisma.plugPayment.aggregate({
          _sum: { amount: true },
          where: { plugId, status: PaymentStatus.OPENED },
        }),
        prisma.resolvePlugPayment.aggregate({
          _sum: { amount: true },
          where: { plugId, paymentStatus: PaymentStatus.OPENED },
        }),
      ]);

      withdrawalAmount =
        (plugPayments._sum.amount || 0) +
        (resolvePlugPayments._sum.amount || 0);
    }

    if (supplierId) {
      const [supplierPayments, resolveSupplierPayments] = await Promise.all([
        prisma.supplierPayment.aggregate({
          _sum: { amount: true },
          where: { supplierId, status: PaymentStatus.OPENED },
        }),
        prisma.resolveSupplierPayment.aggregate({
          _sum: { amount: true },
          where: { supplierId, paymentStatus: PaymentStatus.OPENED },
        }),
      ]);

      withdrawalAmount =
        (supplierPayments._sum.amount || 0) +
        (resolveSupplierPayments._sum.amount || 0);
    }

    if (withdrawalAmount! <= 0) {
       res
        .status(400)
        .json({ error: "No funds available for withdrawal!" });
        return;
    }

    // Create Paystack recipient
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
          bank_code: bank_code,
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

    // Initiate transfer
    const transferResponse = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: withdrawalAmount! * 100,
        recipient: recipientData.data.recipient_code,
        reason: "Withdrawal",
      }),
    });

    const transferData = await transferResponse.json();
    if (!transferData.status || !transferData.data?.reference) {
      // Log failed withdrawal
      if (plugId) {
        await prisma.plugWithdrawalHistory.create({
          data: {
            plugId,
            amount: withdrawalAmount!,
            reference: "",
            status: "FAILED",
          },
        });
      }
      if (supplierId) {
        await prisma.supplierWithdrawalHistory.create({
          data: {
            supplierId,
            amount: withdrawalAmount!,
            reference: "",
            status: "FAILED",
          },
        });
      }
      res.status(500).json({ error: "Withdrawal failed!" });
      return;
    }

    const reference = transferData.data.reference;

    // Update DB atomically
    const tx: any[] = [];

    if (plugId) {
      tx.push(
        prisma.plugPayment.updateMany({
          where: { plugId, status: PaymentStatus.OPENED },
          data: { status: PaymentStatus.PAID },
        }),
        prisma.resolvePlugPayment.updateMany({
          where: { plugId, paymentStatus: PaymentStatus.OPENED },
          data: { paymentStatus: PaymentStatus.PAID },
        })
      );
    }

    if (supplierId) {
      tx.push(
        prisma.supplierPayment.updateMany({
          where: { supplierId, status: PaymentStatus.OPENED },
          data: { status: PaymentStatus.PAID },
        }),
        prisma.resolveSupplierPayment.updateMany({
          where: { supplierId, paymentStatus: PaymentStatus.OPENED },
          data: { paymentStatus: PaymentStatus.PAID },
        })
      );
    }

    tx.push(
      prisma.withdrawalVerificationToken.delete({
        where: { id: withdrawalToken.id },
      })
    );

    await prisma.$transaction(tx);

    // Log successful withdrawal
    if (plugId) {
      await prisma.plugWithdrawalHistory.create({
        data: {
          plugId,
          amount: withdrawalAmount!,
          reference,
          status: "SUCCESS",
        },
      });
    }

    if (supplierId) {
      await prisma.supplierWithdrawalHistory.create({
        data: {
          supplierId,
          amount: withdrawalAmount!,
          reference,
          status: "SUCCESS",
        },
      });
    }

    res.status(200).json({ message: "Withdrawal processed successfully!" });
    return;
  } catch (error) {
    next(error);
  }
}

export async function getPlugPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plugId = req.plug?.id!;
    // Regular plug payments
    const [locked, opened, paid] = await Promise.all([
      prisma.plugPayment.aggregate({
        _sum: { amount: true },
        where: { plugId, status: PaymentStatus.LOCKED },
      }),
      prisma.plugPayment.aggregate({
        _sum: { amount: true },
        where: { plugId, status: PaymentStatus.OPENED },
      }),
      prisma.plugPayment.aggregate({
        _sum: { amount: true },
        where: { plugId, status: PaymentStatus.PAID },
      }),
    ]);

    // Resolved plug payments
    const [resolvedOpened, resolvedPaid] = await Promise.all([
      prisma.resolvePlugPayment.aggregate({
        _sum: { amount: true },
        where: { plugId, paymentStatus: PaymentStatus.OPENED },
      }),
      prisma.resolvePlugPayment.aggregate({
        _sum: { amount: true },
        where: { plugId, paymentStatus: PaymentStatus.PAID },
      }),
    ]);

    const lockedAmount = locked._sum.amount || 0;
    const unlockedAmount =
      (opened._sum.amount || 0) + (resolvedOpened._sum.amount || 0);
    const paidAmount =
      (paid._sum.amount || 0) + (resolvedPaid._sum.amount || 0);
    const totalEarnings = unlockedAmount + paidAmount;

    res.status(200).json({
      message: "Plug earnings fetched successfully!",
      data: {
        lockedAmount,
        unlockedAmount,
        totalEarnings,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getSupplierPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const supplierId = req.supplier?.id!;
    // Regular supplier payments
    const [locked, opened, paid] = await Promise.all([
      prisma.supplierPayment.aggregate({
        _sum: { amount: true },
        where: { supplierId, status: PaymentStatus.LOCKED },
      }),
      prisma.supplierPayment.aggregate({
        _sum: { amount: true },
        where: { supplierId, status: PaymentStatus.OPENED },
      }),
      prisma.supplierPayment.aggregate({
        _sum: { amount: true },
        where: { supplierId, status: PaymentStatus.PAID },
      }),
    ]);

    // Resolved supplier payments
    const [resolvedOpened, resolvedPaid] = await Promise.all([
      prisma.resolveSupplierPayment.aggregate({
        _sum: { amount: true },
        where: { supplierId, paymentStatus: PaymentStatus.OPENED },
      }),
      prisma.resolveSupplierPayment.aggregate({
        _sum: { amount: true },
        where: { supplierId, paymentStatus: PaymentStatus.PAID },
      }),
    ]);

    const lockedAmount = locked._sum.amount || 0;
    const unlockedAmount =
      (opened._sum.amount || 0) + (resolvedOpened._sum.amount || 0);
    const paidAmount =
      (paid._sum.amount || 0) + (resolvedPaid._sum.amount || 0);
    const totalEarnings = unlockedAmount + paidAmount;

    res.status(200).json({
      message: "Supplier earnings fetched successfully!",
      data: {
        lockedAmount,
        unlockedAmount,
        totalEarnings,
      },
    });
  } catch (error) {
    next(error);
  }
}

export const getPlugPendingPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const plugId = req.plug?.id!;
    const payments = await prisma.plugPayment.findMany({
      where: { status: PaymentStatus.LOCKED, plugId },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    const result = payments.map((payment) => ({
            orderNumber: payment.order.orderNumber,
            daysLeft: getReturnDaysLeft(payment.createdAt),
            amount: payment.amount,
          }));

    res.status(200).json({ message: "Pending payments fetched", result });
  } catch (err) {
    next(err);
  }
};
export const getSupplierPendingPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplierId = req.plug?.id!;
    const payments = await prisma.supplierPayment.findMany({
      where: { status: PaymentStatus.LOCKED, supplierId },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    const result = payments.map((payment) => ({
            orderNumber: payment.order.orderNumber,
            daysLeft: getReturnDaysLeft(payment.createdAt),
            amount: payment.amount,
          }));

    res.status(200).json({ message: "Pending payments fetched", result });
  } catch (err) {
    next(err);
  }
};
