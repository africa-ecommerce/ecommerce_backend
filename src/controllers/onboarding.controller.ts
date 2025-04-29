
// src/controllers/onboarding.controller.ts
import { Response } from "express";
import { prisma } from "../config";
import { UserType } from "@prisma/client";
import { AuthRequest } from "../types";
import { generateTokens, setAuthCookies } from "../helper/token";
import { supplierInfoSchema, plugInfoSchema } from "../lib/zod/schema";
import { uploadMiddleware } from "../helper/minioObjectStore/productImage";
import {
  uploadImages,
  deleteImages
} from "../helper/minioObjectStore/productImage";
import { z } from "zod";

export const onboarding = [
  // accept one optional file called "avatar"
  uploadMiddleware.single("avatar"),

  async (req: AuthRequest, res: Response) => {
    let avatarUrl: string | null = null;

    try {
      // 1) Auth check
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized!" });
        return;
      }

      // 2) userType check
      const { userType } = req.body;
      if (!Object.values(UserType).includes(userType as UserType)) {
        res.status(400).json({ error: "Invalid user type!" });
        return;
      }

      //
      // 3a) SUPPLIER branch
      //
      let supplierData: z.infer<typeof supplierInfoSchema> | null = null;
      if (userType === UserType.SUPPLIER) {
        // pull directly from req.body
        const supParse = supplierInfoSchema.safeParse({
          businessName: req.body.supplierInfo.businessName,
          businessType: req.body.supplierInfo.businessType,
          pickupLocation: req.body.supplierInfo.pickupLocation,
        });

        if (!supParse.success) {
          res.status(400).json({
            error: "Supplier validation failed!",
          });
          return;
        }
        supplierData = supParse.data;

       
        const existingSupplier = await prisma.supplier.findUnique({
          where: { userId },
        });
        if (existingSupplier) {
          res
            .status(409)
            .json({ error: "User already onboarded as supplier!" });
          return;
        }

        // optional avatar upload
        if (req.file) {
          const [url] = await uploadImages([req.file] as any);
          avatarUrl = url;
        }
      }

      //
      // 3b) PLUG branch
      //
      let plugData: z.infer<typeof plugInfoSchema> | null = null;
      if (userType === UserType.PLUG) {
        // assume your form posts:
        //   generalMerchant, niches (array), and profile as an object
        const plugParse = plugInfoSchema.safeParse({
          generalMerchant: req.body.generalMerchant === "true" || req.body.generalMerchant === true,
          niches: Array.isArray(req.body.niches)
            ? req.body.niches
            : req.body.niches
            ? [req.body.niches]
            : [],
          profile: req.body.profile,
        });

        if (!plugParse.success) {
          res.status(400).json({
            error: "Plug validation failed!",
          });
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

      //
      // 4) Commit everything in one transaction
      //
      await prisma.$transaction(async (tx) => {
        // mark user onboarded
        await tx.user.update({
          where: { id: userId },
          data: { userType, isOnboarded: true },
        });

        // create supplier row
        if (userType === UserType.SUPPLIER && supplierData) {
          const { businessName, businessType, pickupLocation } = supplierData;
          await tx.supplier.create({
            data: {
              userId,
              businessName,
              businessType: businessType ?? "",
              pickupLocation,
              avatar: avatarUrl,
            },
          });
        }

        // create plug row
        if (userType === UserType.PLUG && plugData) {
          const {
            generalMerchant,
            niches,
            profile: { businessName, phone, state, aboutBusiness },
          } = plugData;

          await tx.plug.create({
            data: {
              userId,
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

      // 5) Return success with cookies/tokens
      const tokens = await generateTokens(
        userId,
        true,
        userType as UserType
      );
      setAuthCookies(res, tokens);
      res.status(200).json({ message: "Onboarding completed successfully!" });
      return;
    } catch (err) {
      console.error("Onboarding error:", err);

      // rollback avatar
      if (avatarUrl) {
        await deleteImages([avatarUrl]);
      }

      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },
];
