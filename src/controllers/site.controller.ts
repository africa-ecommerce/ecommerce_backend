// import { Request, Response } from "express";
// import { z } from "zod";
// import { prisma } from "../config";
// import {
//   saveSiteConfigToMinio,
//   getSiteConfigFromMinio,
//   deleteSiteConfigFromMinio,
//   updateSiteConfigInMinio,
// } from "../helper/minioObjectStore/siteConfig";
// import { subdomainSchema } from "../lib/zod/schema";
// import { AuthRequest } from "../types";

// // Create site
// export const createSite = async (req: AuthRequest, res: Response) => {
//   let configUrl;
//   try {
//     const plug = req.plug!;

//     const data = req.body;

//     // If subdomain or configUrl is already set, it means the user already has a site
//     if (plug.subdomain || plug.configUrl) {
//       res.status(409).json({
//         error: "You already have an existing site!",
//       });
//       return;
//     }

//    const subdomain = data.subdomain.toLowerCase();

//     if (!subdomain) {
//       res.status(400).json({ error: "Subdomain is required!" });
//       return;
//     }

//     // Validate subdomain
//     try {
//       subdomainSchema.parse(subdomain);
//     } catch (error) {
//       if (error instanceof z.ZodError) {
//         res.status(400).json({ error: "Invalid subdomain format!" });
//         return;
//       }
//     }

//     const available = await prisma.plug.findFirst({
//       where: {
//         subdomain,
//       },
//     });

//     // Check if subdomain is available
//     if (!!available) {
//       res.status(409).json({ error: "Subdomain already in use!" });
//       return;
//     }

//     // Get config from request body
//     const { config } = data;

//     if (!config) {
//       res.status(400).json({ error: "Config data is required!" });
//       return;
//     }

//     try {
//       // Save config to MinIO
//       configUrl = await saveSiteConfigToMinio(subdomain, config);

//       // Update Plug record with subdomain and configUrl
//       await prisma.plug.update({
//         where: { id: plug.id },
//         data: {
//           subdomain,
//           configUrl,
//         },
//       });

//       // Generate site URL based on subdomain
//       const siteUrl = `https://${subdomain}.pluggn.com`;

//       res.status(201).json({
//         message: "Site created successfully!",
//         siteUrl,
//       });
//     } catch (error) {
//       // If there's an error during the MinIO save or database update
//       // make sure to clean up any successful operations to maintain consistency
//       if (configUrl) {
//         await deleteSiteConfigFromMinio(subdomain);
//       }
//       throw error; // Re-throw to be caught by outer catch block
//     } 
//   } catch (error) {
//     console.error("Error creating site:", error);
//     res.status(500).json({ error: "Failed to create site!" });
//   }
// };

// // // Get site configuration
// // export const getSiteConfig = async (req: Request, res: Response) => {
// //   try {
// //     const plugId = req.params.plugId;

// //     // Find the plug by ID
// //     const plug = await prisma.plug.findUnique({
// //       where: { id: plugId },
// //     });

// //     // Check if user has a site configuration
// //     if (!plug?.subdomain || !plug?.configUrl) {
// //       res.status(404).json({ error: "User has no site configuration!" });
// //       return;
// //     }

// //     // Get config from MinIO
// //     const config = await getSiteConfigFromMinio(plug?.subdomain);

// //     if (!config) {
// //       res.status(404).json({ error: "Site configuration not found!" });
// //       return;
// //     }

// //     // Generate site URL based on subdomain
// //     const siteUrl = `https://${plug?.subdomain}.pluggn.com`;

// //     res.status(200).json({
// //       siteUrl,
// //       config,
// //     });
// //   } catch (error) {
// //     console.error("Error getting site config:", error);
// //     res.status(500).json({ error: "Failed to fetch site configuration!" });
// //   }
// // };

// /// Update site 
// export const updateSite = async (req: AuthRequest, res: Response) => {
//   let configUrl;
//   try {
//     const plug = req.plug!;

//     // Check if user has a site 
//     if (!plug.subdomain || !plug.configUrl) {
//       res.status(404).json({ error: "User has no site!" });
//       return;
//     }

//     const oldSubdomain = plug.subdomain;
//     const data = req.body;
//     // const { subdomain: newSubdomain, config } = data;

//     const newSubdomain = data.subdomain.toLowerCase();

//     // If changing subdomain, validate and check availability
//     if (newSubdomain && newSubdomain !== oldSubdomain) {
//       // Validate new subdomain
//       try {
//         subdomainSchema.parse(newSubdomain);
//       } catch (error) {
//         if (error instanceof z.ZodError) {
//           res.status(400).json({ error: "Invalid subdomain format!" });
//           return;
//         }
//       }

//       // Check if new subdomain is available
//       const existing = await prisma.plug.findFirst({
//         where: {
//           subdomain: newSubdomain,
//         },
//       });

//       if (!!existing) {
//         res.status(409).json({ error: "Subdomain already in use!" });
//         return;
//       }
//     }

//     // Use current subdomain if no new one is provided
//     const subdomain = newSubdomain || oldSubdomain;

//     try {

//       const { config } = data;
//       // First, update config in MinIO
//       // If config or subdomain is not provided, use existing values

//       if (!config) {
//         configUrl = plug.configUrl;
//       }
//       // If config is provided, save it to MinIO
//       else {
//         const newConfigUrl = await updateSiteConfigInMinio(subdomain, config);
//         configUrl = newConfigUrl;
//       }
     
   

//       // If subdomain changed, delete old config from MinIO
//       if (newSubdomain && newSubdomain !== oldSubdomain) {
//         await deleteSiteConfigFromMinio(oldSubdomain);
//       }

//       // Then update database record
//       await prisma.plug.update({
//         where: { id: plug.id },
//         data: {
//           subdomain,
//           configUrl,
//         },
//       });

//       // Generate site URL based on subdomain
//       const siteUrl = `https://${subdomain}.pluggn.com`;

//       res.status(200).json({
//         message: "Site updated successfully!",
//         siteUrl,
//       });
//     } catch (error) {
//       // If there was an error, try to clean up
//       if (configUrl && newSubdomain && newSubdomain !== oldSubdomain) {
//         // Try to restore the original state
//         await deleteSiteConfigFromMinio(newSubdomain);
//         // Don't need to restore old config as we didn't delete it first
//       }
//       throw error; // Re-throw to be caught by outer catch block
//     }
//   } catch (error) {
//     console.error("Error updating site:", error);
//     res.status(500).json({ error: "Failed to update site!" });
//   }
// };

// // Delete site 
// export const deleteSite = async (req: AuthRequest, res: Response) => {
//   try {
//     const plug = req.plug!;

//     // Check if user has a site
//     if (!plug.subdomain || !plug.configUrl) {
//       res.status(404).json({ error: "User has no site!" });
//       return;
//     }

//     const subdomain = plug.subdomain;
//     let minioDeleted = false;
//     let dbUpdated = false;

//     try {
//       // Delete config from MinIO first
//       await deleteSiteConfigFromMinio(subdomain);
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
//         message: "Site deleted successfully!",
//       });
//     } catch (error) {
//       // If MinIO delete succeeded but database update failed
//       // This is a rare inconsistent state that would require admin intervention
//       if (minioDeleted && !dbUpdated) {
//         console.error(
//           `Critical error: MinIO object deleted but DB not updated for plug ${plug.id}`
//         );
//       }
//       throw error; // Re-throw to be caught by outer catch block
//     }
//   } catch (error) {
//     console.error("Error deleting site:", error);
//     res.status(500).json({ error: "Failed to delete site!" });
//   }
// };

// // Check if subdomain is available
// export const checkSubdomainAvailability = async (
//   req: AuthRequest,
//   res: Response
// ) => {
//   try {
//     const data  = req.body;
//     const plug = req.plug!;

//     const subdomain = data.subdomain.toLowerCase();
//     // Validate subdomain format
//     try {
//       subdomainSchema.parse(subdomain);
//     } catch (error) {
//       if (error instanceof z.ZodError) {
//         res.status(400).json({
//           error: "Invalid subdomain format!",
//         });
//         return;
//       }
//     }

//     // Check if subdomain is already in use
//     const existing = await prisma.plug.findFirst({
//       where: {
//         subdomain,
//         id: { not: plug.id }, // Exclude current plug
//       },
//     });

//     const available = !existing;

//     res.status(200).json({
//       message: "Subdomain checked successfully!",
//       available,
//     });
//   } catch (error) {
//     console.error("Error checking subdomain availability:", error);
//     res.status(500).json({ error: "Error checking subdomain!" });
//   }
// };







import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config";
import {
  saveSiteConfigToMinio,
  getSiteConfigFromMinio,
  deleteSiteConfigFromMinio,
  updateSiteConfigInMinio,
} from "../helper/minioObjectStore/siteConfig";
import { subdomainSchema } from "../lib/zod/schema";
import { AuthRequest } from "../types";

/**
 * Create a new site for a user
 * Ensures atomicity between MinIO and database operations
 */
export const createSite = async (req: AuthRequest, res: Response) => {
  let configUrl: string | undefined;
  let minioOperationSucceeded = false;
  
  try {
    const plug = req.plug!;
    const data = req.body;

    // If subdomain or configUrl is already set, it means the user already has a site
    if (plug.subdomain || plug.configUrl) {
      res.status(409).json({
        error: "You already have an existing site!",
      });
      return;
    }

    // Trim and lowercase subdomain
    const subdomain = data.subdomain ? data.subdomain.trim().toLowerCase() : undefined;

    if (!subdomain) {
      res.status(400).json({ error: "Subdomain is required!" });
      return;
    }

    // Validate subdomain
    try {
      subdomainSchema.parse(subdomain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid subdomain format!" });
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
      res.status(409).json({ error: "Subdomain already in use!" });
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
      configUrl = await saveSiteConfigToMinio(subdomain, config);
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

      // Generate site URL based on subdomain
      const siteUrl = `https://${subdomain}.pluggn.com`;

      res.status(201).json({
        message: "Site created successfully!",
        siteUrl,
      });
    } catch (innerError) {
      // Rollback MinIO operation if it succeeded but database failed
      if (minioOperationSucceeded) {
        try {
          await deleteSiteConfigFromMinio(subdomain);
        } catch (rollbackError) {
          console.error(`Failed to roll back MinIO operation for subdomain ${subdomain}:`, rollbackError);
          // Log this for admin intervention
        }
      }
      throw innerError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("Error creating site:", error);
    res.status(500).json({ error: "Failed to create site!" });
  }
};

/**
 * Update an existing site
 * Ensures atomicity between MinIO and database operations
 */
export const updateSite = async (req: AuthRequest, res: Response) => {
  let newConfigUrl: string | undefined;
  let oldConfigBackup: any | undefined;
  let minioUpdateSucceeded = false;
  let minioDeleteSucceeded = false;
  
  try {
    const plug = req.plug!;
    const data = req.body;

    // Check if user has a site 
    if (!plug.subdomain || !plug.configUrl) {
      res.status(404).json({ error: "User has no site!" });
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
          res.status(400).json({ error: "Invalid subdomain format!" });
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
        res.status(409).json({ error: "Subdomain already in use!" });
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
          oldConfigBackup = await getSiteConfigFromMinio(oldSubdomain);
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
        newConfigUrl = await updateSiteConfigInMinio(subdomain, config);
        minioUpdateSucceeded = true;
      }

      // If subdomain changed, delete old MinIO config after new one is saved
      if (newSubdomain && newSubdomain !== oldSubdomain) {
        await deleteSiteConfigFromMinio(oldSubdomain);
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
      const siteUrl = `https://${subdomain}.pluggn.com`;

      res.status(200).json({
        message: "Site updated successfully!",
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
              await saveSiteConfigToMinio(oldSubdomain, oldConfigBackup);
            }
            
            // And delete the new one if it was created
            await deleteSiteConfigFromMinio(newSubdomain);
          } 
          // If subdomain didn't change but config did, restore old config
          else if (oldConfigBackup) {
            await saveSiteConfigToMinio(subdomain, oldConfigBackup);
          }
        }
        
        // 2. If we deleted old config but failed after that
        if (minioDeleteSucceeded && oldConfigBackup) {
          await saveSiteConfigToMinio(oldSubdomain, oldConfigBackup);
        }
      } catch (rollbackError) {
        console.error(`Failed to roll back MinIO operations for ${oldSubdomain} or ${newSubdomain}:`, rollbackError);
        // Log this for admin intervention
      }
      
      throw innerError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("Error updating site:", error);
    res.status(500).json({ error: "Failed to update site!" });
  }
};

/**
 * Delete a site
 * Ensures atomicity between MinIO and database operations
 */
export const deleteSite = async (req: AuthRequest, res: Response) => {
  let configBackup: any | undefined;
  let minioDeleted = false;
  let dbUpdated = false;
  
  try {
    const plug = req.plug!;

    // Check if user has a site
    if (!plug.subdomain || !plug.configUrl) {
      res.status(404).json({ error: "User has no site!" });
      return;
    }

    const subdomain = plug.subdomain;

    try {
      // Backup config for potential rollback
      try {
        configBackup = await getSiteConfigFromMinio(subdomain);
      } catch (backupError) {
        console.error(`Cannot backup config for ${subdomain} before deletion:`, backupError);
        // Continue even if backup fails
      }

      // Delete config from MinIO first
      await deleteSiteConfigFromMinio(subdomain);
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
        message: "Site deleted successfully!",
      });
    } catch (innerError) {
      // If MinIO delete succeeded but database update failed
      if (minioDeleted && !dbUpdated && configBackup) {
        try {
          // Try to restore the deleted config
          await saveSiteConfigToMinio(subdomain, configBackup);
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
    console.error("Error deleting site:", error);
    res.status(500).json({ error: "Failed to delete site!" });
  }
};

/**
 * Check if subdomain is available
 */
export const checkSubdomainAvailability = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const data = req.body;
    const plug = req.plug!;

    // Trim and lowercase subdomain
    const subdomain = data.subdomain ? data.subdomain.trim().toLowerCase() : undefined;
    
    if (!subdomain) {
      res.status(400).json({ error: "Subdomain is required!" });
      return;
    }
    
    // Validate subdomain format
    try {
      subdomainSchema.parse(subdomain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Invalid subdomain format!",
        });
        return;
      }
    }

    // Check if subdomain is already in use
    const existing = await prisma.plug.findFirst({
      where: {
        subdomain,
        id: { not: plug.id }, // Exclude current plug
      },
    });

    const available = !existing;

    res.status(200).json({
      message: "Subdomain checked successfully!",
      available,
    });
  } catch (error) {
    console.error("Error checking subdomain availability:", error);
    res.status(500).json({ error: "Error checking subdomain!" });
  }
};