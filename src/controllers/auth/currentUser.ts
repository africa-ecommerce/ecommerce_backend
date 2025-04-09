import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Assuming req.user is populated by your Passport middleware.
    const userId = req.user?.id;
    if (!userId) {
       res.status(401).json({ error: "Authentication required!" });
       return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        policy: true,
        isOnboarded: true,
        userType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!currentUser) {
       res.status(404).json({ error: "User not found!" });
       return;
    }

     res.status(200).json({ user: currentUser });
     return;
  } catch (error) {
    next(error);
  }
};
