class HugoService {
  async generateStore(merchantId: string) {
    const merchant = await getMerchantWithProducts(merchantId);
    const template = await fs.readFile("static/templates/fashion.html");
    const compiled = Handlebars.compile(template.toString());

    // Inject SEO metadata
    const html = compiled({
      ...merchant,
      products: merchant.products.map((p) => ({
        ...p,
        price: formatPrice(p.price, merchant.currency),
        unit: p.localUnit || "unit",
      })),
    });

    await deployToCDN(merchantId, html); // Netlify/Cloudflare
  }
}










// import { execSync } from 'child_process';
// import fs from 'fs-extra';
// import path from 'path';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// export class HugoService {
//   private readonly basePath = path.join(__dirname, '../../static/generated');
  
//   async createSite(merchantId: string) {
//     const merchant = await prisma.merchant.findUnique({
//       where: { id: merchantId },
//       include: { products: true, locations: true }
//     });

//     const sitePath = path.join(this.basePath, merchantId);
//     const templatePath = this.getTemplatePath(merchant.businessType);
    
//     // Copy template
//     await fs.copy(templatePath, sitePath);
    
//     // Generate content files
//     await this.generateContentFiles(merchant, sitePath);
    
//     // Build site
//     execSync(`cd ${sitePath} && hugo --minify`, { stdio: 'inherit' });
    
//     return this.getSiteUrl(merchant);
//   }

//   private async generateContentFiles(merchant: any, sitePath: string) {
//     // Generate products content
//     await Promise.all(
//       merchant.products.map((product: any) => 
//         fs.writeFile(
//           path.join(sitePath, 'content/products', `${product.id}.md`),
//           `---
// title: "${product.name}"
// price: ${product.price}
// unit: "${product.localUnit}"
// images: [${product.images.join(',')}]
// ---\n${product.description}`
//         )
//     );

//     // Generate config
//     await fs.writeFile(
//       path.join(sitePath, 'config/_default/config.yaml'),
//       `baseURL: "${this.getSiteUrl(merchant)}"
// title: "${merchant.businessName}"
// params:
//   colors:
//     primary: "#4F46E5"
//   logo: "${merchant.logoUrl}"
// menu:
//   main:
//     - name: Products
//       url: /products
//     - name: About
//       url: /about`
//     );
//   }

//   private getSiteUrl(merchant: any) {
//     return merchant.tier === 'BUSINESS' && merchant.customDomain 
//       ? `https://${merchant.customDomain}`
//       : `https://${merchant.businessName}.africonnect.com`;
//   }
// }