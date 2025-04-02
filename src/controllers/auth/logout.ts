import { Request, Response } from "express";
import { prisma } from "../../config";
import { addToDenylist } from "../../helper/addToDenyList";
import jwt from "jsonwebtoken";

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    // 1. Invalidate access token
    if (token) {
      const decoded = jwt.decode(token) as { exp: number } | null;
      if (decoded?.exp) {
        const ttl = Math.max(0, decoded.exp * 1000 - Date.now());
        await addToDenylist(token, ttl);
      }
    }

    // 2. Invalidate refresh token from database
    if (refreshToken) {
      await prisma.user.updateMany({
        where: { refreshToken },
        data: { refreshToken: null },
      });
    }

    // 3. Clear client-side cookies
    res
      .clearCookie("accessToken")
      .clearCookie("refreshToken")
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during logout",
    });
  }
};
