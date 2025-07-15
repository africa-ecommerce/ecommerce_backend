import { Response, NextFunction, Request } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";

export const getAllSuppliers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const suppliers = await prisma.user.findMany({
      where: {
        userType: "SUPPLIER"
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        isOnboarded: true,
        createdAt: true,
        updatedAt: true,
        supplier: {
          select: {
            id: true,
            businessName: true,
            businessType: true,
            phone: true,
            avatar: true,
            verified: true,
            pickupLocation: {
              select: {
                streetAddress: true,
                lga: true,
                state: true,
                directions: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      message: "Suppliers fetched successfully!",
      suppliers,
    });
  } catch (error) {
    next(error);
  }
};
