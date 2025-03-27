import { Request, Response } from "express";
import isEmail from "validator/lib/isEmail"; // Using validator library for email validation
import { prisma } from "../../config";
import bcrypt from "bcryptjs";
import { sendVerificationMail } from "../../helper/sendVeriificationMail";
import { v4 as uuidv4 } from "uuid";
import session from "express-session";


export interface CustomSession extends session.Session {
  unverifiedEmail?: string |  null
}

function isValidFullName(fullName: string): boolean {
  const nameParts = fullName.trim().split(/\s+/);
  return nameParts.length > 1;
}

export const register = async (req: Request, res: Response) => {
  try {
    // Destructure and validate required fields
    let { name, email, password } = req.body; //------------> full names? validate on frontend zod

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

    // Validate email format and password length
    if (!isEmail(email)) {
       res.status(400).json({ error: "Invalid email format" });
       return;
    }

    // password length validation
    if (password.length < 6) {
       res.status(400).json({ error: "Minimum 6 characters required!" });
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
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // create a user with unverified email
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationToken,
        tokenExpires,
        emailVerified: false,
      },
    });

    //send verification email
    await sendVerificationMail(email, verificationToken, "register");

    // Cast session to your custom type and store the unverified email
    const customSession = req.session as CustomSession;

    // Save unverified email in session for later use (secure server-side storage)
    customSession.unverifiedEmail = email;
     res.status(201).json({ message: "Verification email sent!" });
  } catch (error: any) {
    // Log the error for internal debugging
    console.error("Registration error:", error);
     res.status(500).json({ error: "Internal server error!" });
     return;
  }
};

