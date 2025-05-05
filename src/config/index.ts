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
  stdTTL: 300, // Cache TTL: 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // For better performance with large objects
});


// Helper to generate consistent cache keys from query parameters
export function generateCacheKey(params: any): string {
  // Sort keys to ensure consistent order
  const sortedKeys = Object.keys(params).sort();
  const keyParts = sortedKeys.map(key => {
    const value = params[key];
    return `${key}:${value}`;
  });
  
  return keyParts.join('|');
}

// Clear cache entries when products are updated/created/deleted
export function invalidateProductCache() {
  productCache.flushAll();
}

export const jwtSecret = process.env.JWT_SECRET || "defaultsecret";
export const refreshTokenSecret = process.env.REFRESH_SECRET || "defaultsecret";
export const port = process.env.PORT || 5000;
