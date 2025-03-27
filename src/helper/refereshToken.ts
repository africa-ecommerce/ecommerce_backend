import { AuthRequest } from "../middleware/auth.middleware";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config";
import { Response, NextFunction } from "express";



// Add to app.ts after auth middleware
export const refreshToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user) {
    // Refresh access token on every request
    const newAccessToken = jwt.sign({ userId: req.user.id }, jwtSecret, {
      expiresIn: "15m",
    });

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
  }
  next();
};
