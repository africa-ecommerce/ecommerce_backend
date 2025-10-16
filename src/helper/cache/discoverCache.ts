import NodeCache from "node-cache";
import type { Product } from "@prisma/client";



// Create a cache instance for discover stacks
export const discoverCache = new NodeCache({
  stdTTL: 12 * 60 * 60, // 12 hours
  checkperiod: 60 * 60, // Clean expired keys every hour
  useClones: false,
  maxKeys: 5000,
  deleteOnExpire: true,
});

// Cache data type
export interface DiscoverStack {
  createdAt: Date;
  products: Product[];
}