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

export const jwtSecret = process.env.JWT_SECRET || "JWT_SECRET";
export const refreshTokenSecret = process.env.REFRESH_SECRET || "REFRESH_SECRET";
export const port = 5000;
