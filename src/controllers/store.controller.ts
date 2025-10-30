// import {NextFunction, Response } from "express";
// import { z } from "zod";
// import { prisma } from "../config";
// import {
//   saveStoreConfigToMinio,
//   getStoreConfigFromMinio,
//   deleteStoreConfigFromMinio,
// } from "../helper/minioObjectStore/storeConfig";
// import { subdomainSchema } from "../lib/zod/schema";
// import { AuthRequest } from "../types";



// /**
//  * Create a new store for a user.
//  * Ensures atomic behavior between MinIO and DB using a two-phase commit pattern.
//  */
// export const createStore = async (req: AuthRequest, res: Response, next: NextFunction) => {
//   const plug = req.plug!;
//   const data = req.body;

//   if (plug.subdomain || plug.configUrl) {
//      res.status(409).json({ error: "You already have an existing store!" });
//      return;
//   }

//   const subdomain = plug.normalizedBusinessName;
//   if (!subdomain) {
//      res.status(400).json({ error: "No normalized business name found!" });
//      return;
//   }

//   const { config } = data;
//   if (!config) {
//     res.status(400).json({ error: "Config data is required!" });
//     return;
//   } 

//   let configUrl: string | undefined;

//   try {
//     // 🔹 1. Save config to MinIO (phase 1)
//     configUrl = await saveStoreConfigToMinio(subdomain, config);

//     // 🔹 2. Try to write to DB (phase 2)
//     await prisma.$transaction(async (tx) => {
//       await tx.plug.update({
//         where: { id: plug.id },
//         data: {
//           subdomain,
//           configUrl,
//         },
//       });
//     });

//     // 🔹 3. Both succeeded → return success
//     const siteUrl = `https://${subdomain}.pluggn.store`;
//      res.status(201).json({
//       message: "Store created successfully!",
//       siteUrl,
//     });
//   } catch (error) {
//     console.error("❌ Store creation failed, initiating rollback:", error);

//     // 🔹 Rollback logic
//     try {
//       // If DB failed after MinIO success, delete MinIO config
//       if (configUrl) await deleteStoreConfigFromMinio(subdomain);

//       // If DB partially wrote, ensure cleanup
//       await prisma.plug.updateMany({
//         where: { id: plug.id, subdomain },
//         data: { subdomain: null, configUrl: null },
//       });
//     } catch (rollbackError) {
//       console.error("⚠️ Rollback failed:", rollbackError);
//     }

//     next(error);
//   }
// };

// /**
//  * Update an existing store
//  * Ensures atomicity between MinIO and database operations
//  */
// export const updateStore = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   let newConfigUrl: string | undefined;
//   let oldConfigBackup: any | undefined;
//   let minioUpdateSucceeded = false;

//   try {
//     const plug = req.plug!;
//     const data = req.body;
//     // Check if user has a store
//     if (!plug.subdomain || !plug.configUrl) {
//       res.status(404).json({ error: "User has no store!" });
//       return;
//     }
//     const oldSubdomain = plug.subdomain;
//     // ✅ Always force subdomain from normalizedBusinessName
//     const subdomain = plug.normalizedBusinessName;
//     const { config } = data;

//     try {
//       // Step 1: Backup old config
//       if (config) {
//         oldConfigBackup = await getStoreConfigFromMinio(oldSubdomain).catch(
//           () => null
//         );
//       }

//       // Step 2: Save new config to MinIO
//       if (config) {
//         newConfigUrl = await saveStoreConfigToMinio(subdomain, config);
//         minioUpdateSucceeded = true;
//       } else {
//         newConfigUrl = plug.configUrl;
//       }

//       // Step 3: Update DB in transaction
//       await prisma.$transaction(async (tx) => {
//         await tx.plug.update({
//           where: { id: plug.id },
//           data: { subdomain, configUrl: newConfigUrl },
//         });
//       });

//       // Step 4: Only now, delete old MinIO file if subdomain changed
//       if (subdomain !== oldSubdomain) {
//         await deleteStoreConfigFromMinio(oldSubdomain).catch(console.error);
//       }

//       res
//         .status(200)
//         .json({
//           message: "Store updated successfully!",
//           siteUrl: `https://${subdomain}.pluggn.store`,
//         });
//     } catch (innerError) {
//       // Rollback if MinIO succeeded but DB failed
//       if (minioUpdateSucceeded && oldConfigBackup) {
//         await saveStoreConfigToMinio(oldSubdomain, oldConfigBackup).catch(
//           console.error
//         );
//       }
//       throw innerError;
//     }
//   } catch (error) {
//     next(error);
//   }
// };
// /**
//  * Delete a store
//  * Ensures atomicity between MinIO and database operations
//  */
// export const deleteStore = async (req: AuthRequest, res: Response, next: NextFunction) => {
//   let configBackup: any | undefined;
//   let minioDeleted = false;
//   let dbUpdated = false;
  
//   try {
//     const plug = req.plug!;

//     // Check if user has a store
//     if (!plug.subdomain || !plug.configUrl) {
//       res.status(404).json({ error: "User has no store!" });
//       return;
//     }

//     const subdomain = plug.subdomain;

//     try {
//       // Backup config for potential rollback
//       try {
//         configBackup = await getStoreConfigFromMinio(subdomain);
//       } catch (backupError) {
//         console.error(`Cannot backup config for ${subdomain} before deletion:`, backupError);
//         // Continue even if backup fails
//       }

//       // Delete config from MinIO first
//       await deleteStoreConfigFromMinio(subdomain);
//       minioDeleted = true;

//       // Then update database
//       await prisma.plug.update({
//         where: { id: plug.id },
//         data: {
//           subdomain: null,
//           configUrl: null,
//         },
//       });
//       dbUpdated = true;

//       res.status(200).json({
//         message: "Store deleted successfully!",
//       });
//     } catch (innerError) {
//       // If MinIO delete succeeded but database update failed
//       if (minioDeleted && !dbUpdated && configBackup) {
//         try {
//           // Try to restore the deleted config
//           await saveStoreConfigToMinio(subdomain, configBackup);
//         } catch (rollbackError) {
//           console.error(`Failed to roll back MinIO deletion for ${subdomain}:`, rollbackError);
//         }
        
//         console.error(
//           `Critical error: MinIO object deleted but DB not updated for plug ${plug.id}`
//         );
//       }
//       throw innerError; // Re-throw to be caught by outer catch block
//     }
//   } catch (error) {
//     next(error);
//   }
// };



// export const getStoreConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
//   try {
//     const subdomain = req.plug?.subdomain;

//     if (!subdomain) {
//       res.status(400).json({ error: "User has no subdomain!" });
//       return;
//     }

//     const config = await getStoreConfigFromMinio(subdomain);
//     if (!config) {
//       res.status(404).json({ error: "No config found for store!" });
//       return;
//     }

//     res.status(200).json(config);
//   } catch (error) {
//     next(error);
//   }
// };


// /**
//  * Check if subdomain is available
//  */
// export const checkSubdomainAvailability = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const data = req.body;
//     const plug = req.plug!;

//     // Trim and lowercase subdomain
//     const subdomain = data.subdomain ? data.subdomain.trim().toLowerCase() : undefined;
    
//     if (!subdomain) {
//       res.status(400).json({ error: "Domain is required!" });
//       return;
//     }
    
//     // Validate subdomain format
//     try {
//       subdomainSchema.parse(subdomain);
//     } catch (error) {
//       if (error instanceof z.ZodError) {
//         res.status(400).json({
//           error: "Invalid field data format!",
//         });
//         return;
//       }
//     }
// const existing = await prisma.plug.findFirst({
//   where: {
//     subdomain: {
//       equals: subdomain,
//       mode: "insensitive",
//     },
//     id: { not: plug.id }, // Exclude current plug
//   },
// });

//     const available = !existing;

//     res.status(200).json({
//       message: "Domain checked successfully!",
//       available,
//     });
//   } catch (error) {
//     next(error);
//   }
// };







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
