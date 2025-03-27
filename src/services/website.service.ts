// src/services/website.service.ts
import { prisma } from "../config";
import { exec } from "child_process";
import path from "path";

export interface WebsiteInput {
  subdomain: string;
  title: string;
  tagline?: string;
  content?: string; // Could be JSON or markdown
  theme: string;
}

// Create or update a website configuration for a merchant
export const upsertWebsite = async (merchantId: string, data: WebsiteInput) => {
  const website = await prisma.website.upsert({
    where: { merchantId },
    update: { ...data },
    create: { merchantId, ...data },
  });
  // Trigger Hugo build after creation/update
  await triggerHugoBuild(website);
  return website;
};

// Get website configuration
export const getWebsite = async (merchantId: string) => {
  return await prisma.website.findUnique({ where: { merchantId } });
};

// Delete website configuration
export const deleteWebsite = async (merchantId: string) => {
  return await prisma.website.delete({ where: { merchantId } });
};

// Trigger a Hugo build for the given website configuration
export const triggerHugoBuild = async (website: any) => {
  return new Promise<void>((resolve, reject) => {
    // Define the Hugo content directory for this website
    // For example, each merchant’s site is stored in /hugo-sites/{subdomain}
    const sitePath = path.join(
      __dirname,
      "../../hugo-sites",
      website.subdomain
    );

    // Optionally write website.content to a file that Hugo will consume (e.g., content/_index.md)
    // Here we assume you have a template that reads site configuration from a data file.
    // You can add fs.writeFileSync() calls here as needed.

    // Construct the Hugo build command.
    // For example: hugo --source <sitePath> --destination <sitePath>/public
    const cmd = `hugo --source ${sitePath} --destination ${sitePath}/public`;

    // Update website buildStatus to 'building'
    prisma.website.update({
      where: { id: website.id },
      data: { buildStatus: "building" },
    });

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        // Update buildStatus to error in DB
        prisma.website.update({
          where: { id: website.id },
          data: { buildStatus: "error" },
        });
        console.error("Hugo build error:", stderr);
        return reject(error);
      }
      // Update buildStatus to success in DB
      prisma.website.update({
        where: { id: website.id },
        data: { buildStatus: "success" },
      });
      console.log("Hugo build output:", stdout);
      resolve();
    });
  });
};



// Deployment Considerations

// Reverse Proxy: Nginx configuration for subdomain routing

// nginx
// Copy
// server {
//   listen 80;
//   server_name ~^(?<subdomain>.+)\.africonnect\.com$;
  
//   location / {
//     proxy_pass http://localhost:3000;
//     proxy_set_header Host $host;
//     proxy_set_header X-Real-IP $remote_addr;
//   }
// }




// Caching Strategy:

// nginx
// Copy
// location / {
//   proxy_cache africonnect_cache;
//   proxy_cache_valid 200 302 10m;
//   proxy_cache_valid 404      1m;
//   add_header X-Cache-Status $upstream_cache_status;
// }
// Security Headers:

// nginx
// Copy
// add_header Content-Security-Policy "default-src 'self' *.africonnect.com";
// add_header X-Frame-Options DENY;
// add_header X-Content-Type-Options nosniff;