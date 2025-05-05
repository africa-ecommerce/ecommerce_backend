import { Response } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const token = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;


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
      .json({ message: "Logged out successfully!" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error!",
    });
  }
};
