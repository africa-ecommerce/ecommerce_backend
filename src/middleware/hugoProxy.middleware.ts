// src/middleware/dynamicHugoProxy.middleware.ts
import { Request, Response, NextFunction } from "express";
import path from "path";
import express from "express";

export const dynamicHugoProxy = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract subdomain from host (e.g., merchant1.africonnect.com => merchant1)
  const host = req.hostname;
  const subdomain = host.split(".")[0];

  // Compute the path to the Hugo-built site for this subdomain
  const sitePublicDir = path.join(
    __dirname,
    "../../hugo-sites",
    subdomain,
    "public"
  );

  // Serve static files from that directory
  express.static(sitePublicDir)(req, res, next);
};
