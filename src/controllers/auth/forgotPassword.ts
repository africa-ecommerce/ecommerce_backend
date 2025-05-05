import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { prisma } from "../../config";
import { v4 as uuidv4 } from "uuid";
import { sendResetPasswordMail } from "../../helper/sendResetPasswordMail";

export const newPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  // Validate input

  if (!token) {
    res.status(400).json({ error: "Missing token!" });
    return;
  }

  if (!newPassword) {
    res.status(400).json({ error: "Missing password!" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Minimum 6 characters required!" });
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
    return;
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error!" });
    return;
  }
};

export const sendNewPasswordMail = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required!" });
    return;
  }

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

  await sendResetPasswordMail(email, verificationToken);

  res.status(200).json({
    message: "Reset link has been sent to registered email!",
  });
};


export const resendNewPasswordMail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required!" });
      return;
    }

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
    await sendResetPasswordMail(email, passwordToken.token);

    res.status(200).json({
      message: "Reset link has been resent to registered email!",
    });
  } catch (error: any) {
    console.error("Resend new password error:", error);
    res.status(500).json({ error: "Internal server error!" });
  }
};
