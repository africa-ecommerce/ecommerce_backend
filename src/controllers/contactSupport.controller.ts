import { NextFunction, Request, Response } from "express";
import { mail } from "../lib/mail";
import { emailConfigs } from "../config";
import { queueMail } from "../helper/workers/mailQueue";

//try saving this mail in db also first, for us to reference and send in background
export async function contactSupport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { email, subject, message } = req.body;
  try {
    const { support } = emailConfigs;
    await queueMail({
      to: support.user,
      subject,
      html: message,
      senderKey: "support",
      replyTo: email,
    });

    res.status(200).json({ message: "Your mail has been received!" });
  } catch (error) {
    next(error);
  }
}
