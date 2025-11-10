import { Response, NextFunction } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized!" });
      return;
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        isOnboarded: true,
        userType: true,
        createdAt: true,
        updatedAt: true,
        // Include supplier data if this user is a supplier
        supplier: {
          select: {
            id: true,
            businessName: true,
            businessType: true,
            pickupLocation: {
              select: {
                streetAddress: true,
                lga: true,
                state: true,
                directions: true,
              },
            },
            phone: true,
            avatar: true,
            subdomain: true,
            configUrl: true,
          },
        },
        // Include plug data if this user is a plug
        plug: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            state: true,
            aboutBusiness: true,
            niches: true,
            avatar: true,
            generalMerchant: true,
            subdomain: true,
            configUrl: true,
          },
        },
      },
    });

    if (!currentUser) {
      res.status(404).json({ error: "User not found!" });
      return;
    }
    res.status(200).json({ message: "User fetched successfully!", user: currentUser });
  } catch (error) {
    next(error);
  }
};