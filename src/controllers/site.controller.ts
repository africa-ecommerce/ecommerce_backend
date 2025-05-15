import { Response } from "express";
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

// Create site configuration
export const createSiteConfig = async (req: AuthRequest, res: Response) => {
  let configUrl;
  let subdomain;
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

    subdomain = data.subdomain;

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
      // Save config to MinIO
      configUrl = await saveSiteConfigToMinio(subdomain, config);

      // Update Plug record with subdomain and configUrl
      await prisma.plug.update({
        where: { id: plug.id },
        data: {
          subdomain,
          configUrl,
        },
      });

      // Generate site URL based on subdomain
      const siteUrl = `https://${subdomain}.pluggn.com`;

      res.status(201).json({
        message: "Site configured successfully!",
        siteUrl,
      });
    } catch (error) {
      // If there's an error during the MinIO save or database update
      // make sure to clean up any successful operations to maintain consistency
      if (configUrl) {
        await deleteSiteConfigFromMinio(subdomain);
      }
      throw error; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error("Error creating site config:", error);
    res.status(500).json({ error: "Failed to configure site!" });
  }
};

// Get site configuration
export const getSiteConfig = async (req: AuthRequest, res: Response) => {
  try {
    const plug = req.plug!;

    // Check if user has a site configuration
    if (!plug.subdomain || !plug.configUrl) {
      res.status(404).json({ error: "User has no site configuration!" });
      return;
    }

    // Get config from MinIO
    const config = await getSiteConfigFromMinio(plug.subdomain);

    if (!config) {
      res.status(404).json({ error: "Site configuration not found!" });
      return;
    }

    // Generate site URL based on subdomain
    const siteUrl = `https://${plug.subdomain}.pluggn.com`;

    res.status(200).json({
      siteUrl,
      config,
    });
  } catch (error) {
    console.error("Error getting site config:", error);
    res.status(500).json({ error: "Failed to fetch site configuration!" });
  }
};

/// Update site configuration
export const updateSiteConfig = async (req: AuthRequest, res: Response) => {
  let configUrl;
  let oldSubdomain;
  try {
    const plug = req.plug!;

    // Check if user has a site configuration
    if (!plug.subdomain || !plug.configUrl) {
      res.status(404).json({ error: "User has no site configuration!" });
      return;
    }

    oldSubdomain = plug.subdomain;
    const data = req.body;
    const { siteName: newSubdomain, config } = data;

    // If changing subdomain, validate and check availability
    if (newSubdomain && newSubdomain !== oldSubdomain) {
      // Validate new subdomain
      try {
        subdomainSchema.parse({ subdomain: newSubdomain });
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
          id: { not: plug.id }, // Exclude current plug
        },
      });

      if (!!existing) {
        res.status(409).json({ error: "Subdomain already in use!" });
        return;
      }
    }

    // Use current subdomain if no new one is provided
    const subdomain = newSubdomain || oldSubdomain;

    try {
      // First, update config in MinIO
      configUrl = await updateSiteConfigInMinio(subdomain, config);

      // If subdomain changed, delete old config from MinIO
      if (newSubdomain && newSubdomain !== oldSubdomain) {
        await deleteSiteConfigFromMinio(oldSubdomain);
      }

      // Then update database record
      await prisma.plug.update({
        where: { id: plug.id },
        data: {
          subdomain,
          configUrl,
        },
      });

      // Generate site URL based on subdomain
      const siteUrl = `https://${subdomain}.pluggn.com`;

      res.status(200).json({
        message: "Site configuration updated successfully!",
        siteUrl,
      });
    } catch (error) {
      // If there was an error, try to clean up
      if (configUrl && newSubdomain && newSubdomain !== oldSubdomain) {
        // Try to restore the original state
        await deleteSiteConfigFromMinio(newSubdomain);
        // Don't need to restore old config as we didn't delete it first
      }
      throw error; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error("Error updating site config:", error);
    res.status(500).json({ error: "Failed to update site configuration!" });
  }
};

// Delete site configuration
export const deleteSiteConfig = async (req: AuthRequest, res: Response) => {
  try {
    const plug = req.plug!;

    // Check if user has a site configuration
    if (!plug.subdomain || !plug.configUrl) {
      res.status(404).json({ error: "Site configuration not found!" });
      return;
    }

    const subdomain = plug.subdomain;
    let minioDeleted = false;
    let dbUpdated = false;

    try {
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
        message: "Site configuration deleted successfully!",
      });
    } catch (error) {
      // If MinIO delete succeeded but database update failed
      // This is a rare inconsistent state that would require admin intervention
      if (minioDeleted && !dbUpdated) {
        console.error(
          `Critical error: MinIO object deleted but DB not updated for plug ${plug.id}`
        );
      }
      throw error; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error("Error deleting site config:", error);
    res.status(500).json({ error: "Failed to delete site configuration!" });
  }
};

// Check if subdomain is available
export const checkSubdomainAvailability = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const  subdomain = req.body;

    // Validate subdomain format
    try {
      subdomainSchema.parse(subdomain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          available: false,
          error: "Invalid subdomain format!",
        });
        return;
      }
    }

    // Check if subdomain is already in use
    const existing = await prisma.plug.findFirst({
      where: {
        subdomain,
      },
    });

    const available = !existing;

    res.status(200).json({
      available,
    });
  } catch (error) {
    console.error("Error checking subdomain availability:", error);
    res.status(500).json({ error: "Error checking subdomain!" });
  }
};
