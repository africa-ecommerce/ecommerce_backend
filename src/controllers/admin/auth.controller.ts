//USING OTP
import { adminAccount, prisma } from "../../config";
import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { otpMail } from "../../helper/mail/admin/otpMail";
import jwt from "jsonwebtoken";
import { cookieConfig } from "../../helper/token";


export const sendAdminOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.adminOTP.create({
      data: {
        token: otp,
        expires,
      },
    });

    await otpMail(adminAccount, otp);

    res.status(200).json({ message: "OTP sent!" });
  } catch (err) {
    next(err);
  }
};


export const verifyAdminOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      res.status(400).json({ error: "OTP is required." });
      return;
    }
    const record = await prisma.adminOTP.findUnique({
      where: { token: otp }, // token is unique
    });

    if (!record || record.expires < new Date()) {
      res.status(400).json({ error: "Invalid or expired OTP." });
      return;
    }

    // Delete OTP record immediately after verification
    await prisma.adminOTP.delete({
      where: { id: record.id },
    });

    const token = jwt.sign(
      { admin: true }, // see explanation below
      process.env.JWT_SECRET!,
      { expiresIn: "15m" }
    );

    // (Recommended) set it as an HttpOnly cookie
    res.cookie("admin_token", token, {
        ...cookieConfig,
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ message: "OTP verified." });
  } catch (err) {
    next(err);
  }
};