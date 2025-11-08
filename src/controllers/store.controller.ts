import { NextFunction, Response } from "express";
import { z } from "zod";
import { prisma } from "../config";
import {
  saveStoreConfigToMinio,
  getStoreConfigFromMinio,
  deleteStoreConfigFromMinio,
} from "../helper/minioObjectStore/storeConfig";
import { subdomainSchema } from "../lib/zod/schema";
import { AuthRequest } from "../types";
import { currentUser } from "../helper/helperFunc";

/**
 * Utility: Get current user
 */


/**
 * Create a new store (works for both Plug and Supplier)
 */
export const createStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, plug, supplier, id } =  currentUser(req);
    const data = req.body;

    const owner = type === "PLUG" ? plug : supplier;

    if (owner?.subdomain || owner?.configUrl) {
       res
        .status(409)
        .json({ error: "You already have an existing store!" });
        return;
    }

    const subdomain = owner?.normalizedBusinessName;
    if (!subdomain) {
       res
        .status(400)
        .json({ error: "No normalized business name found!" });
        return;
    }

    const { config } = data;
    if (!config) {
       res.status(400).json({ error: "Config data is required!" });
       return;
    }

    let configUrl: string | undefined;

    // Step 1: Save to MinIO
    configUrl = await saveStoreConfigToMinio(subdomain, config);

    // Step 2: Write to DB atomically
    await prisma.$transaction(async (tx) => {
      if (type === "PLUG") {
        await tx.plug.update({
          where: { id },
          data: { subdomain, configUrl },
        });
      } else {
        await tx.supplier.update({
          where: { id },
          data: { subdomain, configUrl },
        });
      }
    });

    const siteUrl = `https://${subdomain}.pluggn.store`;
    res.status(201).json({
      message: "Store created successfully!",
      siteUrl,
    });
  } catch (error) {
    console.error("❌ Store creation failed:", error);
    next(error);
  }
};

/**
 * Update existing store
 */
export const updateStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let newConfigUrl: string | undefined;
  let oldConfigBackup: any | undefined;
  let minioUpdateSucceeded = false;

  try {
    const { type, plug, supplier, id } =  currentUser(req);
    const owner = type === "PLUG" ? plug : supplier;
    const data = req.body;

    if (!owner?.subdomain || !owner?.configUrl) {
       res.status(404).json({ error: "User has no store!" });
       return;
    }

    const oldSubdomain = owner?.subdomain;
    const subdomain = owner?.normalizedBusinessName;
    const { config } = data;

    try {
      // Backup old config
      if (config) {
        oldConfigBackup = await getStoreConfigFromMinio(oldSubdomain).catch(
          () => null
        );
      }

      // Save new config to MinIO
      if (config) {
        newConfigUrl = await saveStoreConfigToMinio(subdomain, config);
        minioUpdateSucceeded = true;
      } else {
        newConfigUrl = owner?.configUrl;
      }

      // Update DB atomically
      await prisma.$transaction(async (tx) => {
        if (type === "PLUG") {
          await tx.plug.update({
            where: { id },
            data: { subdomain, configUrl: newConfigUrl },
          });
        } else {
          await tx.supplier.update({
            where: { id },
            data: { subdomain, configUrl: newConfigUrl },
          });
        }
      });

      // Delete old MinIO config if subdomain changed
      if (subdomain !== oldSubdomain) {
        await deleteStoreConfigFromMinio(oldSubdomain).catch(console.error);
      }

      res.status(200).json({
        message: "Store updated successfully!",
        siteUrl: `https://${subdomain}.pluggn.store`,
      });
    } catch (innerError) {
      if (minioUpdateSucceeded && oldConfigBackup) {
        await saveStoreConfigToMinio(oldSubdomain, oldConfigBackup).catch(
          console.error
        );
      }
      throw innerError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a store
 */
export const deleteStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let configBackup: any | undefined;
  let minioDeleted = false;
  let dbUpdated = false;

  try {
    const { type, plug, supplier, id } =  currentUser(req);
    const owner = type === "PLUG" ? plug : supplier;

    if (!owner?.subdomain || !owner?.configUrl) {
       res.status(404).json({ error: "User has no store!" });
       return;
    }

    const subdomain = owner?.subdomain;

    try {
      // Backup config
      configBackup = await getStoreConfigFromMinio(subdomain).catch(() => null);

      // Delete from MinIO
      await deleteStoreConfigFromMinio(subdomain);
      minioDeleted = true;

      // Update DB
      if (type === "PLUG") {
        await prisma.plug.update({
          where: { id },
          data: { subdomain: null, configUrl: null },
        });
      } else {
        await prisma.supplier.update({
          where: { id },
          data: { subdomain: null, configUrl: null },
        });
      }
      dbUpdated = true;

      res.status(200).json({ message: "Store deleted successfully!" });
    } catch (innerError) {
      if (minioDeleted && !dbUpdated && configBackup) {
        await saveStoreConfigToMinio(subdomain, configBackup).catch(
          console.error
        );
      }
      throw innerError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get store config
 */
export const getStoreConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, plug, supplier } =  currentUser(req);
    const owner = type === "PLUG" ? plug : supplier;
    const subdomain = owner?.subdomain;

    if (!subdomain) {
       res.status(400).json({ error: "User has no subdomain!" });
       return;
    }

    const config = await getStoreConfigFromMinio(subdomain);
    if (!config) {
       res.status(404).json({ error: "No config found for store!" });
       return;
    }

    res.status(200).json(config);
  } catch (error) {
    next(error);
  }
};

/**
 * Check subdomain availability
 */
export const checkSubdomainAvailability = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = req.body;
    const { type, plug, supplier, id } =  currentUser(req);
    const owner = type === "PLUG" ? plug : supplier;

    const subdomain = data.subdomain
      ? data.subdomain.trim().toLowerCase()
      : undefined;
    if (!subdomain) {
       res.status(400).json({ error: "Domain is required!" });
       return;
    }

    try {
      subdomainSchema.parse(subdomain);
    } catch (error) {
      if (error instanceof z.ZodError) {
         res.status(400).json({ error: "Invalid field data format!" });
         return;
      }
    }

    // Check across both plug and supplier tables
    const existingPlug = await prisma.plug.findFirst({
      where: {
        subdomain: { equals: subdomain, mode: "insensitive" },
        id: { not: plug?.id },
      },
    });

    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        subdomain: { equals: subdomain, mode: "insensitive" },
        id: { not: supplier?.id },
      },
    });

    const available = !existingPlug && !existingSupplier;

    res.status(200).json({
      message: "Domain checked successfully!",
      available,
    });
  } catch (error) {
    next(error);
  }
};


export const upsertSupplierStorePolicy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplierId = req.supplier?.id!;
    const {
      payOnDelivery,
      returnPolicy,
      returnWindow,
      returnPolicyTerms,
      refundPolicy,
      returnShippingFee,
      supplierShare,
      deliveryLocations = [], // ✅ Expect array from frontend
    } = req.body;

    // ✅ Basic validation
    if (
      typeof payOnDelivery !== "boolean" ||
      typeof returnPolicy !== "boolean"
    ) {
       res
        .status(400)
        .json({ error: "Invalid or missing required fields!" });
        return
    }

    if (returnWindow && (isNaN(returnWindow) || returnWindow < 1)) {
       res
        .status(400)
        .json({ error: "Return window must be a positive integer!" });
        return
    }

    if (!Array.isArray(deliveryLocations)) {
       res
        .status(400)
        .json({ error: "deliveryLocations must be an array" });
        return;
    }

    // 🧩 Fetch existing policy if any
    const existing = await prisma.supplierStorePolicy.findUnique({
      where: { supplierId },
      include: { deliveryLocations: true },
    });

    // ⚙️ Perform upsert + replace locations transactionally
    const policy = await prisma.$transaction(async (tx) => {
      // 1️⃣ Upsert store policy
      const supplierStorePolicy = await tx.supplierStorePolicy.upsert({
        where: { supplierId },
        update: {
          payOnDelivery,
          returnPolicy,
          returnWindow,
          returnPolicyTerms,
          refundPolicy,
          returnShippingFee,
          supplierShare,
        },
        create: {
          supplierId,
          payOnDelivery,
          returnPolicy,
          returnWindow,
          returnPolicyTerms,
          refundPolicy,
          returnShippingFee,
          supplierShare,
        },
      });

      // 2️⃣ Replace all existing delivery locations
      await tx.storeDeliveryLocation.deleteMany({
        where: { policyId: supplierStorePolicy.id },
      });

      if (deliveryLocations.length > 0) {
        await tx.storeDeliveryLocation.createMany({
          data: deliveryLocations.map((loc: any) => ({
            policyId: supplierStorePolicy.id,
            state: loc.state,
            lgas: loc.lgas,
            fee: loc.fee,
            duration: loc.duration,
          })),
        });
      }

      // 3️⃣ Return updated record with nested locations
      const updatedPolicy = await tx.supplierStorePolicy.findUnique({
        where: { id: supplierStorePolicy.id },
        include: { deliveryLocations: true },
      });

      return updatedPolicy;
    });

    res.status(200).json({
      message: existing
        ? "Policy updated successfully!"
        : "Policy created successfully!",
      data: policy,
    });
  } catch (error) {
    console.error("Error in upsertSupplierStorePolicy:", error);
    next(error);
  }
};



export const getSupplierStorePolicy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {

    const supplierId = req?.supplier?.id;

    const supplierStorePolicy = await prisma.supplierStorePolicy.findUnique({
      where: { supplierId },
      include: { deliveryLocations: true },
    });

    if (!supplierStorePolicy) {
      res.status(404).json({ error: "Store policy not found!" });
      return;
    }

    res.status(200).json({ data: supplierStorePolicy });
  } catch (error) {
    next(error);
  }
};
