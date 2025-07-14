import { NextFunction, Request, Response } from "express";
import { mail } from "../lib/mail";
import { emailConfigs } from "../config";



export async function contactSupport(req: Request, res:Response, next: NextFunction) {
  const { email, subject, message } = req.body;
  const { support } = emailConfigs;

  // respond early to avoid smtp blocking issues
  res.status(200).json({ message: "Your mail has been received!" });

  // Send support mail in the background
  setImmediate(() => {
    mail(support.user, subject, message, support, email).catch((error) => {
      console.error("contact support error:", error);
     next(error);
    });
  });
}
