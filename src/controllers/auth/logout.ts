import { Response } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";
import { clearAuthCookies } from "../../helper/token";

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // Only invalidate the token for the currently logged-in user
    if (refreshToken && req.user && req.user.id) {
      await prisma.user.update({
        where: {
          id: req.user?.id,
        },
        data: {
          refreshToken: null,
        },
      });
    }

    // Clear authentication cookies
    clearAuthCookies(res);

    // Return success response
    res.status(200).json({ message: "Logout successfully!" });
  } catch (error) {
    console.error("Logout error:", error);

    // Still clear cookies even if DB update fails
    clearAuthCookies(res);
    res.status(500).json({
      error: "Internal server error!",
    });
  }
};
