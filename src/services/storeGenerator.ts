import { PrismaClient } from "@prisma/client";
import { compileTemplate } from "../utils/templateEngine";
import { deployToCDN } from "../services/cdn";

const prisma = new PrismaClient();

export async function generateStorefront(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      products: true,
      locations: true,
    },
  });

  if (!merchant) throw new Error("Merchant not found");

  // Choose template based on business category
  const template = await compileTemplate(merchant.businessType || "general", {
    merchant,
    products: merchant.products.map((p) => ({
      ...p,
      price: formatLocalPrice(p.price, p.localUnit),
      available: p.inventory > 0,
    })),
    qrCodeUrl: merchant.qrCodes.find((q) => q.type === "STORE")?.targetId,
  });

  // Deploy to CDN with custom domain
  const deployment = await deployToCDN({
    content: template,
    domain:
      merchant.tier === "FREE"
        ? `${merchant.businessName}.africonnect.com`
        : merchant.customDomain,
  });

  return deployment.url;
}

function formatLocalPrice(price: number, unit?: string) {
  return unit
    ? `₦${price.toLocaleString()}/${unit}`
    : `₦${price.toLocaleString()}`;
}
