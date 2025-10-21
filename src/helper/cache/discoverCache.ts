import NodeCache from "node-cache";

// --- Single unified cache instance for discovery stacks ---
export const discoverCache = new NodeCache({
  stdTTL: 6 * 60 * 60, // 6 hours
  checkperiod: 30 * 60, // Check every 30 mins
  useClones: false,
  maxKeys: 2000,
  deleteOnExpire: true,
  forceString: false,
});