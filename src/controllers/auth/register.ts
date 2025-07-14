import { NextFunction, Request, Response } from "express";
import isEmail from "validator/lib/isEmail"; // Using validator library for email validation
import { prisma } from "../../config";
import bcrypt from "bcryptjs";
import { emailVerificationMail } from "../../helper/mail/auth/emailVerificationMail";
import { v4 as uuidv4 } from "uuid";
import { isValidFullName } from "../../helper/helperFunc";
import { passwordSchema } from "../../lib/zod/schema";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Destructure and validate required fields
    let { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "All fields are required!" });
      return;
    }
    if (!isValidFullName(name)) {
      res.status(400).json({
        error: "Please provide full name!",
      });
      return;
    }
    // Sanitize input
    email = email.trim().toLowerCase();
    // Validate email format 
    if (!isEmail(email)) {
      res.status(400).json({ error: "Invalid email format!" });
      return;
    }
     const passwordValidation = passwordSchema.safeParse(password);
     if (!passwordValidation.success) {
       res.status(400).json({ error: passwordValidation.error.message });
       return;
     }
    // check for existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: "Email already registered!" });
      return;
    }
    // Generate verification token and expiration
    const verificationToken = uuidv4();
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // create a user with unverified email
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: false,
        isOnboarded: false, // Explicit default
        userType: "UNSET", // Explicit default
      },
    });

    await prisma.emailVerification.create({
      data: {
        token: verificationToken,
        expires: tokenExpires,
        userId: user.id,
      },
    });
    // Send verification email
    await emailVerificationMail(email, verificationToken);
    res.status(201).json({ message: "Verification email sent!", email });
  } catch (error) {
    next(error);
  }
};
