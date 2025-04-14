import { Response } from "express";
import { prisma } from "../config";
import { UserType } from "@prisma/client";
import { AuthRequest } from "../types";
import { generateTokens, setAuthCookies } from "../helper/token";

// interface Profile {
//   businessName: string;
//   phone: string;
//   aboutBusiness: string;
//   state: string;
// }

// interface OnboardingRequest {
//   userType: UserType;

//   // Supplier-specific
//   businessType?: BusinessType;

//   // Plug-specific
//   profile: Profile;
//   niches: string[];
//   generalMerchant: boolean;
// }

export const onboarding = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const userId = user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized!" }); // ---->
      return;
    }

    const { userType } = req.body;

    console.log("userType", userType);

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
        const {
          supplierInfo: { businessType },
        } = req.body;
        console.log("businessType", businessType);
        // Validate required fields
        if (userType === UserType.SUPPLIER && !businessType) {
          res
            .status(400)
            .json({ error: "Business type is required for suppliers!" });
          return;
        }

        await tx.supplier.upsert({
          where: { userId },
          create: {
            businessType,
            userId,
          },
          update: {
            businessType,
          },
        });
      } else {
        const {
          profile: { businessName, phone, aboutBusiness, state },
          niches,
          generalMerchant,
        } = req.body;

        if (userType === UserType.PLUG && !businessName) {
          res
            .status(400)
            .json({ error: "Business name is required for plugs!" });
          return;
        }

        // Handle plug creation
        await tx.plug.upsert({
          where: { userId },
          create: {
            businessName,
            phone,
            state,
            aboutBusiness,
            niches,
            generalMerchant,
            userId,
          },
          update: {
            businessName,
            phone,
            state,
            aboutBusiness,
            niches,
            generalMerchant,
          },
        });
      }
    });


    //  Generate tokens and set authentication cookies, as user data has changed
      const tokens = await generateTokens(user.id, true, userType);
        setAuthCookies(res, tokens);
    

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
