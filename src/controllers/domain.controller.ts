import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { HugoService } from "../services/hugoGenerator";
import { verifyDomainOwnership } from "../services/dns";

const prisma = new PrismaClient();

export const connectCustomDomain = async (req: Request, res: Response) => {
  const { domain } = req.body;

  // Verify DNS records
  const isValid = await verifyDomainOwnership(domain);
  if (!isValid)
    return res.status(400).json({ error: "DNS verification failed" });

  // Update merchant record
  const merchant = await prisma.merchant.update({
    where: { id: req.merchant!.id },
    data: { customDomain: domain },
  });

  // Regenerate site with new domain
  await HugoService.regenerateSite(merchant.id);

  // Configure SSL
  await generateSSL(domain);

  res.json({ message: "Domain connected successfully" });
};

const generateSSL = async (domain: string) => {
  execSync(`certbot --nginx -d ${domain} --non-interactive --agree-tos`);
};
