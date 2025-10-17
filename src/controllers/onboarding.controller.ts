import { NextFunction, Response } from "express";
import { prisma } from "../config";
import { UserType } from "@prisma/client";
import { AuthRequest } from "../types";
import { generateTokens, setAuthCookies } from "../helper/token";
import {
  supplierInfoSchema,
  plugInfoSchema,
  addressSchema,
} from "../lib/zod/schema";
import {
  uploadMiddleware,
  uploadImages,
  deleteImages,
} from "../helper/minioObjectStore/image";
import { z } from "zod";
import { getGeocode } from "../helper/logistics";
import { normalizeBusinessName } from "../helper/helperFunc";

export const onboarding = [
  uploadMiddleware.single("avatar"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    let avatarUrl: string | null = null;

    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized!" });
        return;
      }

      // Parse userData from body
      let userData;
      try {
        userData = JSON.parse(req.body.userData);
      } catch {
        res.status(400).json({ error: "Invalid field data format!" });
        return;
      }

      const userType = userData.userType as UserType;
      if (!Object.values(UserType).includes(userType)) {
        res.status(400).json({ error: "Invalid user type!" });
        return;
      }

      let supplierData: z.infer<typeof supplierInfoSchema> | null = null;
      let supplierAddressData: z.infer<typeof addressSchema> | null = null;
      // let geocodeData: { lat: number; lng: number } | null = null;
      let plugData: z.infer<typeof plugInfoSchema> | null = null;

      // ✅ Upload avatar if exists
      if (req.file) {
        // const [url] = await uploadImages([req.file] as Express.Multer.File[]);
        const [url] = await uploadImages([req.file] as Express.Multer.File[], {
          avatar: true,
        });
        avatarUrl = url;
      }

      // ------------------------- SUPPLIER FLOW -------------------------
      if (userType === UserType.SUPPLIER) {
        const supParse = supplierInfoSchema.safeParse(userData.supplierInfo);
        const addrParse = addressSchema.safeParse(userData.supplierAddress);
        if (!supParse.success || !addrParse.success) {
          res.status(400).json({ error: "Invalid supplier field data!" });
          return;
        }

        supplierData = supParse.data;
        supplierAddressData = addrParse.data;

        const existingSupplier = await prisma.supplier.findUnique({
          where: { userId },
        });
        if (existingSupplier) {
          res.status(409).json({ error: "User already onboarded as supplier!" });
          return;
        }

        // // 🌍 Geocode supplier address
        // const fullAddress = `${supplierAddressData.streetAddress}, ${supplierAddressData.lga}, ${supplierAddressData.state}`;
        // const geocodeResult = await getGeocode(fullAddress);
        // if (geocodeResult.status !== "success" || !geocodeResult.data) {
        //   throw new Error(`Geocoding failed for supplier address: ${fullAddress}`);
        // }
        // geocodeData = geocodeResult.data;
      }

      // ------------------------- PLUG FLOW -------------------------
      if (userType === UserType.PLUG) {
        const plugParse = plugInfoSchema.safeParse({
          generalMerchant:
            userData.generalMerchant === "true" || userData.generalMerchant === true,
          niches: Array.isArray(userData.niches)
            ? userData.niches
            : userData.niches
            ? [userData.niches]
            : [],
          profile: userData.profile,
        });

        if (!plugParse.success) {
          res.status(400).json({ error: "Invalid plug field data!" });
          return;
        }

        plugData = plugParse.data;

        const existingPlug = await prisma.plug.findUnique({
          where: { userId },
        });
        if (existingPlug) {
          res.status(409).json({ error: "User already onboarded as plug!" });
          return;
        }
      }

      // ------------------------- TRANSACTION -------------------------
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { userType, isOnboarded: true },
        });

        if (
          userType === UserType.SUPPLIER &&
          supplierData &&
          supplierAddressData 
          // geocodeData
        ) {
          const { businessName, businessType, phone } = supplierData;

          const address = await tx.supplierAddress.create({
            data: {
              streetAddress: supplierAddressData.streetAddress.trim(),
              lga: supplierAddressData.lga,
              state: supplierAddressData.state,
              directions: supplierAddressData.directions?.trim(),
              // latitude: geocodeData.lat,
              // longitude: geocodeData.lng,
            },
          });

         
          // Supplier
          await tx.supplier.create({
            data: {
              userId,
              businessName: businessName.trim(),
              normalizedBusinessName: normalizeBusinessName(businessName),
              businessType,
              phone,
              avatar: avatarUrl,
              addressId: address.id,
            },
          });
        }

        if (userType === UserType.PLUG && plugData) {
          const {
            generalMerchant,
            niches,
            profile: { businessName, phone, state, aboutBusiness },
          } = plugData;

        const plug = await tx.plug.create({
          data: {
            userId,
            businessName: businessName.trim().toLowerCase(),
            normalizedBusinessName: normalizeBusinessName(businessName),
            phone,
            state,
            aboutBusiness,
            niches,
            generalMerchant,
            avatar: avatarUrl,
          },
        });

          // Only create if NOT general merchant
          if (!generalMerchant && Array.isArray(niches) && niches.length > 0) {
            const categoryRecords = niches.map((category: string) => ({
              plugId: plug.id,
              category,
              rating: 1.0,
            }));

            await tx.plugCategoryRating.createMany({
              data: categoryRecords,
              skipDuplicates: true, // safety in case rerun
            });
          }

          // Optionally: if general merchant, you can initialize later lazily
        }
      });

      // ✅ Tokens and Success Response
      const tokens = await generateTokens(userId, true, userType);
      setAuthCookies(res, tokens);

      res.status(200).json({ message: "Onboarding completed successfully!" });
    } catch (err) {
      // ❌ Delete avatar if uploaded
      if (avatarUrl) await deleteImages([avatarUrl]);
      next(err);
    }
  },
];



/** Check if plug business name is available */
export const checkPlugBusinessNameAvailability = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { businessName } = req.body;

    if (!businessName || !businessName.trim()) {
      res.status(400).json({ error: "Business name is required!" });
      return;
    }

    const normalized = normalizeBusinessName(businessName);

    const existing = await prisma.plug.findFirst({
      where: { normalizedBusinessName: normalized },
    });

    const available = !existing;

    res.status(200).json({
      message: "Business name checked successfully!",
      available,
    });
  } catch (error) {
    next(error);
  }
};


/** Check if supplier business name is available */
export const checkSupplierBusinessNameAvailability = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { businessName } = req.body;

    if (!businessName || !businessName.trim()) {
      res.status(400).json({ error: "Business name is required!" });
      return;
    }

    const normalized = normalizeBusinessName(businessName);

    const existing = await prisma.supplier.findFirst({
      where: { normalizedBusinessName: normalized },
    });

    const available = !existing;

    res.status(200).json({
      message: "Business name checked successfully!",
      available,
    });
  } catch (error) {
    next(error);
  }
};
