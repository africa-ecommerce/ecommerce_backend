import { NextFunction, Response } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";
import { clearAuthCookies } from "../../helper/token";

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // invalidate the token for the logged-in user
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
    clearAuthCookies(res);
    res.status(200).json({ message: "Logout successfully!" });
  } catch (error) {   
    // Still clear cookies even if DB update fails
    clearAuthCookies(res);
    next(error);
  }
};
