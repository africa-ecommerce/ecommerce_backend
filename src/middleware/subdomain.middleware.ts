import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs-extra";

const prisma = new PrismaClient();

export const subdomainRouter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const host = req.headers.host || "";
  const [subdomain] = host.split(".");

  if (subdomain === "www" || subdomain === "app") return next();

  // Check merchant status
  const merchant = await prisma.merchant.findUnique({
    where: { businessName: subdomain },
    include: { subscription: true },
  });

  if (!merchant) return res.status(404).send("Store not found");

  // Payment enforcement
  if (merchant.subscription?.status !== "ACTIVE") {
    return res.redirect(
      `https://app.africonnect.com/payment-required?merchant=${merchant.id}`
    );
  }

  // Serve static site
  const sitePath = path.join(
    __dirname,
    "../../static/generated",
    merchant.id,
    "public"
  );
  if (!fs.existsSync(sitePath)) {
    return res.status(503).send("Store is being updated");
  }

  express.static(sitePath, {
    setHeaders: (res) => {
      res.set("X-Store-Owner", merchant.businessName);
    },
  })(req, res, next);
};
