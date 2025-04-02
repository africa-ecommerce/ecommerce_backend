import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { prisma } from "../config";
import { BusinessType, UserType } from "@prisma/client";

interface Profile {
  businessName: string;
  phone: string;
  aboutBusiness: string;
  state: string;
}

interface OnboardingRequest {
  userType: UserType;

  // Supplier-specific
  businessType?: BusinessType;

  // Plug-specific
  profile: Profile;
  niches: string[];
  generalMerchant: boolean;
}

export const onboarding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized!" });
      return;
    }

    const {
      userType,
      businessType,
      profile: { businessName, phone, aboutBusiness, state },
      niches,
      //   customNiche,
      //   generalMerchant,
    } = req.body as OnboardingRequest;

    // Validate required fields
    if (userType === UserType.SUPPLIER && !businessType) {
      res
        .status(400)
        .json({ error: "Business type is required for suppliers!" });
      return;
    }

    if (userType === UserType.PLUG && !businessName) {
      res.status(400).json({ error: "Business name is required for plugs!" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Update user type and onboarding status
      await tx.user.update({
        where: { id: userId },
        data: {
          userType,
          isOnboarded: true,
        },
      });

      // Handle supplier creation
      if (userType === UserType.SUPPLIER) {
        return tx.supplier.upsert({
          where: { userId },
          create: {
            businessType: businessType!,
            userId,
          },
          update: {
            businessType: businessType!,
          },
        });
      }

      // Handle plug creation
      return tx.plug.upsert({
        where: { userId },
        create: {
          businessName: businessName!,
          phone,
          state,
          aboutBusiness,
          niches: niches, // Direct array storage

          userId,
        },
        update: {
          businessName: businessName!,
          phone,
          state,
          aboutBusiness,
          niches: niches, // Direct array storage
        },
      });
    });

    // // Format response data
    // const responseData =
    //   userType === UserType.SUPPLIER
    //     ? {
    //         businessType: result.businessType,
    //       }
    //     : {
    //         businessName: result.businessName,
    //         phoneNumber: result.phoneNumber,
    //         state: result.state,
    //         aboutBusiness: result.aboutBusiness,
    //         niches: result.niches?.split(","),
    //       };

    res.status(200).json({
      message: "Onboarding completed successfully!",
      //   data: responseData,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({
      error: "Internal server error!",
    });
  }
};
