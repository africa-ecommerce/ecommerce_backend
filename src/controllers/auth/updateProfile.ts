import { Response } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";
import {
  uploadMiddleware,
  uploadImages,
  deleteImages,
} from "../../helper/minioObjectStore/image";
import { supplierInfoSchema, updatePlugInfoSchema } from "../../lib/zod/schema";

export const updateProfile = [
  // Accept one optional file called "avatar"
  uploadMiddleware.single("avatar"),

  async (req: AuthRequest, res: Response) => {
    let avatarUrl: string | null = null;
    let oldAvatarUrl: string | null = null;

    try {
      // Auth check
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized!" });
        return;
      }

      // Parse and validate update data
      let profileData;
      try {
        profileData =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      } catch (error) {
        res.status(400).json({ error: "Invalid profile data format!" });
        return;
      }

      // Get existing user data
      const user = req.user;

      if (!user) {
        res.status(404).json({ error: "User not found!" });
        return;
      }

      // SUPPLIER profile update
      if (user.userType === "SUPPLIER" && user.supplier) {
        const supplierParse = supplierInfoSchema.safeParse({
          businessName: profileData.businessName,
          phone: profileData.phone,
          pickupLocation: profileData.pickupLocation,
          businessType: profileData.businessType,
        });

        if (!supplierParse.success) {
          res.status(400).json({
            error: "Validation failed!",
          });
          return;
        }

        // Store old avatar URL for potential deletion
        oldAvatarUrl = user.supplier.avatar || null;

        // Handle avatar upload if present
        if (req.file) {
          const [url] = await uploadImages([req.file] as Express.Multer.File[]);
          avatarUrl = url;
        }

        // Update supplier profile
        await prisma.supplier.update({
          where: { userId },
          data: {
            businessName: supplierParse.data.businessName,
            phone: supplierParse.data.phone,
            pickupLocation: supplierParse.data.pickupLocation,
            businessType: supplierParse.data.businessType || "",
            avatar: avatarUrl || oldAvatarUrl, // Keep old avatar if no new one
            updatedAt: new Date(), // Explicitly update the timestamp
          },
        });

        // Delete old avatar if replaced
        if (oldAvatarUrl && avatarUrl && oldAvatarUrl !== avatarUrl) {
          await deleteImages([oldAvatarUrl]);
        }

        res.status(200).json({
          message: "Profile updated successfully!",
          avatar: avatarUrl || oldAvatarUrl,
        });
        return;
      }

      // PLUG profile update
      if (user.userType === "PLUG" && user.plug) {
        const supplierParse = updatePlugInfoSchema.safeParse({
          businessName: profileData.businessName,
          phone: profileData.phone,
          state: profileData.state,
        });

        if (!supplierParse.success) {
          res.status(400).json({
            error: "Validation failed!",
          });
          return;
        }

        // Update plug profile
        await prisma.plug.update({
          where: { userId },
          data: {
            businessName: profileData.businessName,
            phone: profileData.phone,
            state: profileData.state || user.plug.state,
            aboutBusiness: profileData.aboutBusiness || user.plug.aboutBusiness,
            updatedAt: new Date(), // Explicitly update the timestamp
          },
        });

        res.status(200).json({ message: "Profile updated successfully!" });
        return;
      }

      res.status(400).json({ error: "Invalid user. Please Onboard again!" });
      return;
    } catch (err) {
      console.error("Profile update error:", err);

      // Rollback avatar if there was an error
      if (avatarUrl && avatarUrl !== oldAvatarUrl) {
        await deleteImages([avatarUrl]);
      }

      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },
];
