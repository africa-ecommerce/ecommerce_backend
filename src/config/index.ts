import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import NodeCache from "node-cache";

dotenv.config();

// Explicitly extend globalThis
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a singleton PrismaClient instance
export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export const productCache = new NodeCache({
  stdTTL: 120, //  TTL: 2 minutes
  checkperiod: 30, // Check for expired keys more frequently: every 30 seconds
  useClones: false, // For better performance with large objects
  maxKeys: 1000, // Add a max key limit to prevent unbounded memory growth
});

// Helper to generate consistent cache keys from query parameters  ---------> UNDERSTAND THIS, SET UP LATER FOR TEMPLATES AND OTHERS
export function generateCacheKey(params: any): string {
  // Sort keys to ensure consistent order
  const sortedKeys = Object.keys(params).sort();
  const keyParts = sortedKeys.map((key) => {
    const value = params[key];
    return `${key}:${value}`;
  });

  return keyParts.join("|");
}

// Clear cache entries when products are updated/created/deleted
export function invalidateProductCache() {
  productCache.flushAll();
}

export const jwtSecret = process.env.JWT_SECRET || "JWT_SECRET";
export const sessionSecret = process.env.SESSION_SECRET || "SESSION_SECRET";
export const refreshTokenSecret =
  process.env.REFRESH_SECRET || "REFRESH_SECRET";

export const port = Number(process.env.PORT) || 5000;

// Define unique bucket names with a prefix to avoid conflicts in play.min.io
export const minioBucketPrefix = process.env.MINIO_BUCKET_PREFIX || "pluggn";
//  minio images bucket
export const minioImagesBucket = process.env.MINIO_IMAGES_BUCKET || "images";
//  minio user site config bucket
export const minioSiteConfigBucket =
  process.env.MINIO_SITE_CONFIG_BUCKET || "siteconfig";
export const minioEndpoint = process.env.MINIO_ENDPOINT || "play.min.io";
export const minioPort = process.env.MINIO_PORT || "443";
export const minioAccessKey =
  process.env.MINIO_ACCESS_KEY || "Q3AM3UQ867SPQQA43P2F";
export const minioSecretKey =
  process.env.MINIO_SECRET_KEY || "zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG";
export const minioRegion = process.env.MINIO_REGION || "us-east-1";
export const minioBaseUrl = process.env.MINIO_BASE_URL || "https://play.min.io";
export const googleClientId = process.env.GOOGLE_CLIENT_ID || "**************";
export const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET || "************";
export const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
export const frontendUrl = process.env.APP_URL || "http://localhost:3000";
export const emailUser = process.env.EMAIL_USER || "*******";
export const emailPassword = process.env.EMAIL_PASSWORD || "*******";
export const emailFrom =
  process.env.EMAIL_FROM || '"Your App" <your-app@example.com>';
