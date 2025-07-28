// middlewares/routeErrorCatcher.ts
import { Request, Response, NextFunction } from "express";
import { errorMail } from "../helper/mail/dev/errorMail";

export async function routeErrorCatcher(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("Route Error:", err);

  try {
    await errorMail(req, err);
  } catch (error) {
    console.error("Failed to send route error email:", error);
  }
  // Respond first to avoid smtp blocking issues
  res.status(500).json({ success: false, error: "Internal server error!" });

  // setImmediate(() => {
  //   errorMail(req, err).catch((mailErr) => {
  //     console.error("Failed to send route error email:", mailErr);
  //   });
  // });
}


