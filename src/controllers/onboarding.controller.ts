import { Response } from "express";
import { prisma } from "../config";
import { UserType } from "@prisma/client";
import { AuthRequest } from "../types";
import { generateTokens, setAuthCookies } from "../helper/token";

// // interface Profile {
// //   businessName: string;
// //   phone: string;
// //   aboutBusiness: string;
// //   state: string;
// // }

// // interface OnboardingRequest {
// //   userType: UserType;

// //   // Supplier-specific
// //   businessType?: BusinessType;

// //   // Plug-specific
// //   profile: Profile;
// //   niches: string[];
// //   generalMerchant: boolean;
// // }

// export const onboarding = async (req: AuthRequest, res: Response) => {
//   try {
//     const user = req.user;
//     const userId = user?.id;
//     if (!userId) {
//       res.status(401).json({ error: "Unauthorized!" }); // ---->
//       return;
//     }

//     const { userType } = req.body;

//     console.log("userType", userType);

//     await prisma.$transaction(async (tx) => {
//       // Update user type and onboarding status
//       await tx.user.update({
//         where: { id: userId },
//         data: {
//           userType,
//           isOnboarded: true,
//         },
//       });

//       // Handle supplier creation
//       if (userType === UserType.SUPPLIER) {
//         const {
//           supplierInfo: { businessType },
//         } = req.body;
//         console.log("businessType", businessType);
//         // Validate required fields
//         if (userType === UserType.SUPPLIER && !businessType) {
//           res
//             .status(400)
//             .json({ error: "Business type is required for suppliers!" });
//           return;
//         }

//         await tx.supplier.upsert({
//           where: { userId },
//           create: {
//             businessType,
//             userId,
//           },
//           update: {
//             businessType,
//           },
//         });
//       } else {
//         const {
//           profile: { businessName, phone, aboutBusiness, state },
//           niches,
//           generalMerchant,
//         } = req.body;

//         if (userType === UserType.PLUG && !businessName) {
//           res
//             .status(400)
//             .json({ error: "Business name is required for plugs!" });
//           return;
//         }

//         // Handle plug creation
//         await tx.plug.upsert({
//           where: { userId },
//           create: {
//             businessName,
//             phone,
//             state,
//             aboutBusiness,
//             niches,
//             generalMerchant,
//             userId,
//           },
//           update: {
//             businessName,
//             phone,
//             state,
//             aboutBusiness,
//             niches,
//             generalMerchant,
//           },
//         });
//       }
//     });


//     //  Generate tokens and set authentication cookies, as user data has changed
//       const tokens = await generateTokens(user.id, true, userType);
//         setAuthCookies(res, tokens);
    

//     // // Format response data
//     // const responseData =
//     //   userType === UserType.SUPPLIER
//     //     ? {
//     //         businessType: result.businessType,
//     //       }
//     //     : {
//     //         businessName: result.businessName,
//     //         phoneNumber: result.phoneNumber,
//     //         state: result.state,
//     //         aboutBusiness: result.aboutBusiness,
//     //         niches: result.niches?.split(","),
//     //       };


    
//     res.status(200).json({
//       message: "Onboarding completed successfully!",
//       //   data: responseData,
//     });
//   } catch (error) {
//     console.error("Onboarding error:", error);
//     res.status(500).json({
//       error: "Internal server error!",
//     });
//   }
// };



export const onboarding = async (req: AuthRequest, res: Response) => {
  try {
    // Step 1: Authenticate user
    const user = req.user;
    const userId = user?.id;
    if (!userId) {
       res.status(401).json({ error: "Unauthorized!" });
       return;
    }

    // Step 2: Extract and validate request data
    const { userType } = req.body;

    // Validate user type
    if (!Object.values(UserType).includes(userType)) {
       res.status(400).json({ error: "Invalid user type!" });
       return;
    }

    // Step 3: Type-specific validation before starting transaction
    if (userType === UserType.SUPPLIER) {
      const supplierInfo = req.body.supplierInfo;
      if (!supplierInfo || !supplierInfo.businessType) {
         res
          .status(400)
          .json({ error: "Business type is required for suppliers!" });
          return
      }

      // Check if supplier record already exists
      const existingSupplier = await prisma.supplier.findUnique({
        where: { userId },
      });

      if (existingSupplier) {
         res
          .status(409)
          .json({ error: "User already onboarded!" });
          return
      }
    } else if (userType === UserType.PLUG) {
      const { profile } = req.body;

      if (!profile || !profile.businessName) {
         res
          .status(400)
          .json({ error: "Business name is required for plugs!" });
          return;
      }

      // Check if plug record already exists
      const existingPlug = await prisma.plug.findUnique({
        where: { userId },
      });

      if (existingPlug) {
         res.status(409).json({ error: "User already onboarded!" });
          return;
      }
    } else {
       res
        .status(400)
        .json({ error: "Invalid user type!" });
        return;
    }

    // Step 4: All validations passed, execute database changes in a transaction
    await prisma.$transaction(async (tx) => {
      // Update user type and onboarding status
      await tx.user.update({
        where: { id: userId },
        data: {
          userType,
          isOnboarded: true,
        },
      });

      // Create type-specific record
      if (userType === UserType.SUPPLIER) {
        const {
          supplierInfo: { businessType },
        } = req.body;

        await tx.supplier.create({
          data: {
            businessType,
            userId,
          },
        });
      } else if (userType === UserType.PLUG) {
        const {
          profile: { businessName, phone, aboutBusiness, state },
          niches,
          generalMerchant,
        } = req.body;

        await tx.plug.create({
          data: {
            businessName,
            phone,
            state,
            aboutBusiness,
            niches,
            generalMerchant,
            userId,
          },
        });
      }
    });

    // Step 5: Transaction completed successfully, handle auth and response
    const tokens = await generateTokens(user.id, true, userType);
    setAuthCookies(res, tokens);

    res.status(200).json({
      message: "Onboarding completed successfully!",
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({
      error: "Internal server error!",
    });
  }
};