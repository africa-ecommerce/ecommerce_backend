import { Request, Response } from "express";
import { prisma,  } from "../../config";
import { sendVerificationMail } from "../../helper/sendVerificationMail";
import { v4 as uuidv4 } from "uuid";


export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(401).json({ error: "Missing token!" });
      return;
    }
    if (typeof token !== "string") {
      res.status(401).json({ error: "Invalid token!" });
      return;
    }

    const verification = await prisma.emailVerification.findFirst({
      where: {
        token,
        expires: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verification?.user) {
      res.status(401).json({ error: "Token is invalid or has expired!" });
      return;
    }

    // Update user verification status
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.user.id },
        data: { emailVerified: true },
      }),
      prisma.emailVerification.delete({
        where: { id: verification.id },
      }),
    ]);

   
    res.status(200).json({
      message: "Email verified! Redirecting...",
      user: {
        id: verification.user.id,
        email: verification.user.email,
        name: verification.user.name,
      },
    });
  } catch (error: any) {
    console.error("Email verification error:", error);
    res.status(500).json({ error: "Internal server error!" });
    return;
  }
};



export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    // Get the email from the request body 
    const { email } = req.body;
    if (!email) {
      res.status(400).json({
        error: "Please provide an email",
      });
      return;
    }

    // Find the user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "User not found. Please register again!" });
      return;
    }
    if (user.emailVerified) {
      res.status(409).json({ error: "Email already verified!" });
      return;
    }

    // Check if the verification token is still valid; if not, generate a new one

    let verification = await prisma.emailVerification.findUnique({
      where: { userId: user.id },
    });

    // Regenerate token if expired or missing
    if (!verification || verification.expires < new Date()) {
      const newToken = uuidv4();
      const newExpires = new Date(Date.now() + 3600000);

      verification = await prisma.emailVerification.upsert({
        where: { userId: user.id },
        create: {
          token: newToken,
          expires: newExpires,
          userId: user.id,
        },
        update: {
          token: newToken,
          expires: newExpires,
        },
      });
    }

    await sendVerificationMail(email, verification.token);
    res.status(200).json({ message: "Verification email resent!" });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Internal server error!" });
  }
};
