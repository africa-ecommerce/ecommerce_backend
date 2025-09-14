import {NextFunction, Response } from "express";
import { z } from "zod";
import { prisma } from "../config";
import {
  saveStoreConfigToMinio,
  getStoreConfigFromMinio,
  deleteStoreConfigFromMinio,
  updateStoreConfigInMinio,
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

    // Trim and lowercase subdomain
    const subdomain = (data.subdomain || "").toString().trim().toLowerCase();
    
    if (!subdomain) {
      res.status(400).json({ error: "Domain is required!" });
      return;
    }
    // Validate subdomain
    try {
      subdomainSchema.parse(subdomain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid field data format!" });
        return;
      }
    }

    const available = await prisma.plug.findFirst({
      where: {
        subdomain,
      },
    });

    // Check if subdomain is available
    if (!!available) {
      res.status(409).json({ error: "Domain already in use!" });
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
          console.error(`Failed to roll back MinIO operation for subdomain ${subdomain}:`, rollbackError);
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
export const updateStore = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let newConfigUrl: string | undefined;
  let oldConfigBackup: any | undefined;
  let minioUpdateSucceeded = false;
  let minioDeleteSucceeded = false;
  
  try {
    const plug = req.plug!;
    const data = req.body;
    // Check if user has a store 
    if (!plug.subdomain || !plug.configUrl) {
      res.status(404).json({ error: "User has no store!" });
      return;
    }
    const oldSubdomain = plug.subdomain;
    // Trim and lowercase subdomain if provided
    const newSubdomain = data.subdomain ? data.subdomain.trim().toLowerCase() : undefined;
    // If changing subdomain, validate and check availability
    if (newSubdomain && newSubdomain !== oldSubdomain) {
      // Validate new subdomain
      try {
        subdomainSchema.parse(newSubdomain);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: "Invalid field data format!" });
          return;
        }
      }

      // Check if new subdomain is available
      const existing = await prisma.plug.findFirst({
        where: {
          subdomain: newSubdomain,
        },
      });

      if (!!existing) {
        res.status(409).json({ error: "Domain already in use!" });
        return;
      }
    }

    // Use current subdomain if no new one is provided
    const subdomain = newSubdomain || oldSubdomain;
    const { config } = data;

    try {
      // If config provided, backup old config for rollback purposes
      if (config) {
        try {
          oldConfigBackup = await getStoreConfigFromMinio(oldSubdomain);
        } catch (backupError) {
          console.error(`Cannot backup existing config for ${oldSubdomain}:`, backupError);
          // Continue even if backup fails - this is just for rollback
        }
      }

      // Update config in MinIO if needed
      if (!config) {
        newConfigUrl = plug.configUrl;
      } else {
        // If config is provided, save it to MinIO
        newConfigUrl = await updateStoreConfigInMinio(subdomain, config);
        minioUpdateSucceeded = true;
      }

      // If subdomain changed, delete old MinIO config after new one is saved
      if (newSubdomain && newSubdomain !== oldSubdomain) {
        await deleteStoreConfigFromMinio(oldSubdomain);
        minioDeleteSucceeded = true;
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
      // Complex rollback for different scenarios
      try {
        // 1. If we updated MinIO with new config
        if (minioUpdateSucceeded) {
          // If subdomain changed, try to restore old config at old location
          if (newSubdomain && newSubdomain !== oldSubdomain) {
            if (oldConfigBackup) {
              await saveStoreConfigToMinio(oldSubdomain, oldConfigBackup);
            }
            
            // And delete the new one if it was created
            await deleteStoreConfigFromMinio(newSubdomain);
          } 
          // If subdomain didn't change but config did, restore old config
          else if (oldConfigBackup) {
            await saveStoreConfigToMinio(subdomain, oldConfigBackup);
          }
        }
        
        // 2. If we deleted old config but failed after that
        if (minioDeleteSucceeded && oldConfigBackup) {
          await saveStoreConfigToMinio(oldSubdomain, oldConfigBackup);
        }
      } catch (rollbackError) {
        console.error(`Failed to roll back MinIO operations for ${oldSubdomain} or ${newSubdomain}:`, rollbackError);
        // Log this for admin intervention
      }
      
      throw innerError; // Re-throw to be caught by outer catch
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