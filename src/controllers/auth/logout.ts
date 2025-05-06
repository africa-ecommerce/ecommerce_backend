import { Response } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // Only invalidate the token for the currently logged-in user
    if (refreshToken && req.user && req.user.id) {
      await prisma.user.update({
        where: {
          id: req.user?.id,
          refreshToken: refreshToken, 
        },
        data: {
          refreshToken: null,
        },
      });
    }

    // Clear client-side cookies
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
