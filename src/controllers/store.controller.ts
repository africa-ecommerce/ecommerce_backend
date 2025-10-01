import {NextFunction, Response } from "express";
import { z } from "zod";
import { prisma } from "../config";
import {
  saveStoreConfigToMinio,
  getStoreConfigFromMinio,
  deleteStoreConfigFromMinio,
} from "../helper/minioObjectStore/storeConfig";
import { subdomainSchema } from "../lib/zod/schema";
import { AuthRequest } from "../types";


/**
 * Create a new store for a user
 * Ensures atomicity between MinIO and database operations
 */
export const createStore = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let configUrl: string | undefined;
  let minioOperationSucceeded = false;
  
  try {
    const plug = req.plug!;
    const data = req.body;

    // If subdomain or configUrl is already set, it means the user already has a site
    if (plug.subdomain || plug.configUrl) {
      res.status(409).json({
        error: "You already have an existing store!",
      });
      return;
    }

    // ✅ Use normalizedBusinessName as subdomain
    const subdomain = plug.normalizedBusinessName;
    if (!subdomain) {
      res.status(400).json({ error: "No normalized business name found!" });
      return;
    }

    // Get config from request body
    const { config } = data;
    if (!config) {
      res.status(400).json({ error: "Config data is required!" });
      return;
    }
    try {
      // 1. Save config to MinIO first
      configUrl = await saveStoreConfigToMinio(subdomain, config);
      minioOperationSucceeded = true;
      // 2. Update database with transaction
      await prisma.$transaction(async (tx) => {
        await tx.plug.update({
          where: { id: plug.id },
          data: {
            subdomain,
            configUrl,
          },
        });
      });

      // Generate store URL based on subdomain
      const siteUrl = `https://${subdomain}.pluggn.store`;
      res.status(201).json({
        message: "Store created successfully!",
        siteUrl,
      });
    } catch (innerError) {
      // Rollback MinIO operation if it succeeded but database failed
      if (minioOperationSucceeded) {
        try {
          await deleteStoreConfigFromMinio(subdomain);
        } catch (rollbackError) {
          console.error(
            `Failed to roll back MinIO operation for subdomain ${subdomain}:`,
            rollbackError
          );
          // Log this for admin intervention
        }
      }
      throw innerError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing store
 * Ensures atomicity between MinIO and database operations
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
    const plug = req.plug!;
    const data = req.body;
    // Check if user has a store
    if (!plug.subdomain || !plug.configUrl) {
      res.status(404).json({ error: "User has no store!" });
      return;
    }
    const oldSubdomain = plug.subdomain;
    // ✅ Always force subdomain from normalizedBusinessName
    const subdomain = plug.normalizedBusinessName;
    const { config } = data;

    try {
      // If config provided, backup old config for rollback purposes
      if (config) {
        try {
          oldConfigBackup = await getStoreConfigFromMinio(oldSubdomain);
        } catch (backupError) {
          console.error(
            `Cannot backup existing config for ${oldSubdomain}:`,
            backupError
          );
          // Continue even if backup fails - this is just for rollback
        }
      }

      // Update config in MinIO if needed
      if (!config) {
        newConfigUrl = plug.configUrl;
      } else {
        // If config is provided, save it to MinIO
        newConfigUrl = await saveStoreConfigToMinio(subdomain, config);
        minioUpdateSucceeded = true;
      }

      // If subdomain changed (e.g. businessName changed and normalized value updated)
      if (subdomain !== oldSubdomain) {
        try {
          await deleteStoreConfigFromMinio(oldSubdomain);
        } catch (deleteError) {
          console.error(
            `Failed to delete old config from MinIO for ${oldSubdomain}:`,
            deleteError
          );
        }
      }

      // Update database with transaction
      await prisma.$transaction(async (tx) => {
        await tx.plug.update({
          where: { id: plug.id },
          data: {
            subdomain,
            configUrl: newConfigUrl,
          },
        });
      });

      // Generate site URL based on subdomain
      const siteUrl = `https://${subdomain}.pluggn.store`;

      res.status(200).json({
        message: "Store updated successfully!",
        siteUrl,
      });
    } catch (innerError) {
      try {
        if (minioUpdateSucceeded && oldConfigBackup) {
          await saveStoreConfigToMinio(subdomain, oldConfigBackup);
        }
      } catch (rollbackError) {
        console.error(
          `Failed to rollback MinIO operations for ${oldSubdomain}:`,
          rollbackError
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
 * Ensures atomicity between MinIO and database operations
 */
export const deleteStore = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let configBackup: any | undefined;
  let minioDeleted = false;
  let dbUpdated = false;
  
  try {
    const plug = req.plug!;

    // Check if user has a store
    if (!plug.subdomain || !plug.configUrl) {
      res.status(404).json({ error: "User has no store!" });
      return;
    }

    const subdomain = plug.subdomain;

    try {
      // Backup config for potential rollback
      try {
        configBackup = await getStoreConfigFromMinio(subdomain);
      } catch (backupError) {
        console.error(`Cannot backup config for ${subdomain} before deletion:`, backupError);
        // Continue even if backup fails
      }

      // Delete config from MinIO first
      await deleteStoreConfigFromMinio(subdomain);
      minioDeleted = true;

      // Then update database
      await prisma.plug.update({
        where: { id: plug.id },
        data: {
          subdomain: null,
          configUrl: null,
        },
      });
      dbUpdated = true;

      res.status(200).json({
        message: "Store deleted successfully!",
      });
    } catch (innerError) {
      // If MinIO delete succeeded but database update failed
      if (minioDeleted && !dbUpdated && configBackup) {
        try {
          // Try to restore the deleted config
          await saveStoreConfigToMinio(subdomain, configBackup);
        } catch (rollbackError) {
          console.error(`Failed to roll back MinIO deletion for ${subdomain}:`, rollbackError);
        }
        
        console.error(
          `Critical error: MinIO object deleted but DB not updated for plug ${plug.id}`
        );
      }
      throw innerError; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    next(error);
  }
};



export const getStoreConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subdomain = req.plug?.subdomain;

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
 * Check if subdomain is available
 */
export const checkSubdomainAvailability = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = req.body;
    const plug = req.plug!;

    // Trim and lowercase subdomain
    const subdomain = data.subdomain ? data.subdomain.trim().toLowerCase() : undefined;
    
    if (!subdomain) {
      res.status(400).json({ error: "Domain is required!" });
      return;
    }
    
    // Validate subdomain format
    try {
      subdomainSchema.parse(subdomain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Invalid field data format!",
        });
        return;
      }
    }
const existing = await prisma.plug.findFirst({
  where: {
    subdomain: {
      equals: subdomain,
      mode: "insensitive",
    },
    id: { not: plug.id }, // Exclude current plug
  },
});

    const available = !existing;

    res.status(200).json({
      message: "Domain checked successfully!",
      available,
    });
  } catch (error) {
    next(error);
  }
};