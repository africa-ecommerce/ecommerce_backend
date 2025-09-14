import { NextFunction, Response } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";
import {
  uploadMiddleware,
  uploadImages,
  deleteImages,
} from "../../helper/minioObjectStore/image";
import {
  addressSchema,
  updateSupplierInfoSchema,
  updatePlugInfoSchema,
} from "../../lib/zod/schema";
import { z } from "zod";
import { getGeocode } from "../../helper/logistics";


export const updateProfile = [
  uploadMiddleware.single("avatar"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    let avatarUrl: string | null = null;
    let oldAvatarUrl: string | null = null;
    // let geocodeData: { lat: number; lng: number } | null = null;

    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized!" });
        return;
      }

      let profileData;
      try {
        profileData =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      } catch (error) {
        res.status(400).json({ error: "Invalid field data format!" });
        return;
      }

      const user = req.user;
      if (!user) {
        res.status(404).json({ error: "User not found!" });
        return;
      }

      let supplierAddressData: z.infer<typeof addressSchema> | null = null;

      // ------------------------ SUPPLIER UPDATE ------------------------
      if (user.userType === "SUPPLIER" && user.supplier) {
        const supplierParse = updateSupplierInfoSchema.safeParse({
          businessName: profileData.businessName,
          phone: profileData.phone,
        });

        const supplierAddress = {
          streetAddress: profileData["supplierAddress.streetAddress"],
          lga: profileData["supplierAddress.lga"],
          state: profileData["supplierAddress.state"],
          directions: profileData["supplierAddress.directions"] || undefined,
        };
        const addrParse = addressSchema.safeParse(supplierAddress);

        if (!supplierParse.success || !addrParse.success) {
          res.status(400).json({ error: "All fields are required!" });
          return;
        }

        supplierAddressData = addrParse.data;
        const fullAddress = `${supplierAddressData.streetAddress}, ${supplierAddressData.lga}, ${supplierAddressData.state}`;
        // const geocodeResult = await getGeocode(fullAddress);
        // if (geocodeResult.status !== "success" || !geocodeResult.data) {
        //   throw new Error(
        //     `Geocoding failed for supplier address: ${fullAddress}`
        //   );
        // }
        // geocodeData = geocodeResult.data;

        oldAvatarUrl = user.supplier.avatar || null;

        if (req.file) {
          // const [url] = await uploadImages([req.file] as Express.Multer.File[]);

              const [url] = await uploadImages([req.file] as Express.Multer.File[], {
                    avatar: true,
                  });
          avatarUrl = url;
        }

        await prisma.$transaction(async (tx) => {
          await tx.supplier.update({
            where: { userId },
            data: {
              businessName: supplierParse.data.businessName.trim(),
              phone: supplierParse.data.phone,
              avatar: avatarUrl || oldAvatarUrl,
              updatedAt: new Date(),
            },
          });

          if (!user.supplier || !supplierAddressData) {
            res.status(400).json({ error: "Supplier data not found!" });
            return;
          }

          await tx.supplierAddress.update({
            where: { id: user.supplier.addressId },
            data: {
              streetAddress: supplierAddressData.streetAddress.trim(),
              lga: supplierAddressData.lga,
              state: supplierAddressData.state,
              directions: supplierAddressData.directions?.trim(),
              // latitude: geocodeData?.lat,
              // longitude: geocodeData?.lng,
              updatedAt: new Date(),
            },
          });
        });

        if (oldAvatarUrl && avatarUrl && oldAvatarUrl !== avatarUrl) {
          await deleteImages([oldAvatarUrl]);
        }

        res.status(200).json({ message: "Profile updated successfully!" });
        return;
      }

      // ------------------------ PLUG UPDATE ------------------------
      if (user.userType === "PLUG" && user.plug) {
        const plugParse = updatePlugInfoSchema.safeParse({
          businessName: profileData.businessName,
          phone: profileData.phone,
          state: profileData.state,
        });

        if (!plugParse.success) {
          res.status(400).json({ error: "All fields are required!" });
          return;
        }

        oldAvatarUrl = user.plug.avatar || null;

        if (req.file) {
          // const [url] = await uploadImages([req.file] as Express.Multer.File[]);

              const [url] = await uploadImages([req.file] as Express.Multer.File[], {
                    avatar: true,
                  });
          avatarUrl = url;
        }

        await prisma.plug.update({
          where: { userId },
          data: {
            businessName: plugParse.data.businessName?.trim(),
            phone: plugParse.data.phone,
            state: plugParse.data.state || user.plug.state,
            aboutBusiness: profileData.aboutBusiness || user.plug.aboutBusiness,
            avatar: avatarUrl || oldAvatarUrl,
            updatedAt: new Date(),
          },
        });

        if (oldAvatarUrl && avatarUrl && oldAvatarUrl !== avatarUrl) {
          await deleteImages([oldAvatarUrl]);
        }

        res.status(200).json({ message: "Profile updated successfully!" });
        return;
      }

      res.status(400).json({ error: "Please refresh and try again!" });
    } catch (error) {
      if (avatarUrl && avatarUrl !== oldAvatarUrl) {
        await deleteImages([avatarUrl]);
      }

      next(error);
    }
  },
];
