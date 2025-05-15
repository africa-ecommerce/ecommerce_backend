import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config";
import {
  saveSiteConfigToMinio,
  getSiteConfigFromMinio,
  deleteSiteConfigFromMinio,
} from "../helper/minioObjectStore/siteConfig";
import { subdomainSchema } from "../lib/zod/schema";
import { AuthRequest } from "../types";

// Create site configuration
export const createSiteConfig = async (req: AuthRequest, res: Response) => {
  let configUrl;
  let subdomain;
  try {
    const plug = req.plug!;

    const { data } = req.body;

    // Validate subdomain

    console.log("data", data);
    subdomain = data.siteName;

    if (!subdomain) {
      res.status(400).json({ error: "Subdomain is required!" });
      return;
    }
    try {
      subdomainSchema.parse({ subdomain });
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

    // If subdomain or configUrl is already set, it means the user already has a site
    if (plug.subdomain || plug.configUrl) {
      res.status(409).json({
        error: "You already have an existing site!",
      });
      return;
    }

    // Get config from request body
    const { config } = data;


    if (!config) {
      res.status(400).json({ error: "Config data is required!" });
      return;
    }

    // Save config to MinIO
    configUrl = await saveSiteConfigToMinio(subdomain, config);

    // Update Plug record with subdomain and configUrl if not already set
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
    console.error("Error creating site config:", error);
    if (configUrl) {
      await deleteSiteConfigFromMinio(subdomain);
    }
    res.status(500).json({ error: "Failed to configure site!" });
  }
};
