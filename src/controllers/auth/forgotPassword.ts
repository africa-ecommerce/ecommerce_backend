import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config";
import { v4 as uuidv4 } from "uuid";
import { resetPasswordMail } from "../../helper/mail/auth/resetPasswordMail";
import { passwordSchema } from "../../lib/zod/schema";

export const newPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;

  // Validate input

  if (!token) {
    res.status(400).json({ error: "Missing token!" });
    return;
  }

  const passwordValidation = passwordSchema.safeParse(newPassword);
  if (!passwordValidation.success) {
    res.status(400).json({ error: passwordValidation.error.message });
    return;
  }

  try {
    // Find the reset token in the database
    const tokenRecord = await prisma.passwordToken.findUnique({
      where: { token },
    });

    // Check if token exists and is still valid (not expired)
    if (!tokenRecord) {
      res.status(400).json({ error: "Invalid token!" });
      return;
    }

    if (tokenRecord.expires < new Date()) {
      res.status(400).json({ error: "Token has expired!" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: tokenRecord.email },
    });

    if (!user) {
      res.status(400).json({ error: "Invalid Email!" });
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the token so it cannot be reused
    await prisma.passwordToken.delete({
      where: { id: tokenRecord.id },
    });

    res.status(200).json({ message: "Password reset successful!" });
  } catch (error) {
    next(error);
  }
};

export const sendNewPasswordMail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required!" });
    return;
  }
  // Sanitize input
  email = email.trim().toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // For security, always return a success message
    if (!user) {
      res.status(200).json({
        message: "Reset link has been sent to registered email!",
      });
      return;
    }

    // Generate verification token and expiration
    const verificationToken = uuidv4();
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the token with expiration in the database
    await prisma.passwordToken.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expires: tokenExpires,
        email,
      },
    });

    await resetPasswordMail(email, verificationToken);

    res.status(200).json({
      message: "Reset link has been sent to registered email!",
    });
  } catch (error) {
    next(error);
  }
};

export const resendNewPasswordMail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required!" });
      return;
    }

    // Sanitize input
    email = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return the same generic message for security reasons
    if (!user) {
      res.status(200).json({
        message: "Reset link has been resent to registered email!",
      });
      return;
    }

    // Check if a valid password reset token already exists
    let passwordToken = await prisma.passwordToken.findFirst({
      where: {
        email,
        expires: { gt: new Date() },
      },
    });
    if (!passwordToken) {
      const verificationToken = uuidv4();
      const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity
      passwordToken = await prisma.passwordToken.create({
        data: {
          token: verificationToken,
          userId: user.id,
          email,
          expires: tokenExpires,
        },
      });
    }

    // Send the reset password email using the token
    await resetPasswordMail(email, passwordToken.token);

    res.status(200).json({
      message: "Reset link has been resent to registered email!",
    });
  } catch (error: any) {
   next(error);
  }
};
