import { Redis } from "@upstash/redis";
import { upstashRedisRestUrl, upstashRedisRestToken } from "../../config";

export const redis = new Redis({
  url: upstashRedisRestUrl,
  token: upstashRedisRestToken,
});

const DISCOVER_TTL = 6 * 60 * 60; // 6 hours
const LOCK_TTL = 20; // 20 seconds

export interface DiscoverStack {
  ids: string[];
  createdAt: number;
}

export async function getDiscoverStack(
  plugId: string
): Promise<DiscoverStack | null> {
  const raw = await redis.get(`discover_stack_v10_${plugId}`);

  if (!raw) return null;

  // Handle both cases: already parsed object or JSON string
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (!parsed || !Array.isArray(parsed.ids)) return null;
  return parsed;
}

export async function setDiscoverStack(plugId: string, ids: string[]) {
  const stack: DiscoverStack = { ids, createdAt: Date.now() };
  await redis.set(`discover_stack_v10_${plugId}`, JSON.stringify(stack), {
    ex: DISCOVER_TTL,
  });
}

/**
 * Updates or creates the user's current discover page in cache.
 * ⚡ Does NOT refresh the TTL — it always expires with the main stack.
 */
export async function updateDiscoverPage(plugId: string, page: number) {
  const pageKey = `discover_page_v10_${plugId}`;

  // Check if page key already exists
  const exists = await redis.exists(pageKey);
  if (exists) {
    // Update the value only, do not reset TTL
    await redis.set(pageKey, page);
  } else {
    // Sync page key expiration with main stack TTL
    const stackTtl = await redis.ttl(`discover_stack_v10_${plugId}`);
    if (stackTtl > 0) {
      await redis.set(pageKey, page, { ex: stackTtl });
    } else {
      await redis.set(pageKey, page, { ex: DISCOVER_TTL }); // fallback
    }
  }
}

/**
 * Gets the user’s last known discover page from cache.
 * Returns 1 if no page found.
 */
export async function getDiscoverPage(plugId: string): Promise<number> {
  const page = await redis.get<number>(`discover_page_v10_${plugId}`);
  return typeof page === "number" ? page : 1;
}

/**
 * Lock helpers to prevent multiple concurrent stack generations.
 */
export async function acquireLock(plugId: string): Promise<boolean> {
  const res = await redis.set(`lock_discover_v10_${plugId}`, "locked", {
    nx: true,
    ex: LOCK_TTL,
  });
  return res === "OK";
}

export async function releaseLock(plugId: string) {
  await redis.del(`lock_discover_v10_${plugId}`);
}

/**
 * Waits for the stack to appear if another process is building it.
 */
export async function waitForStack(
  plugId: string,
  timeoutMs = 8000,
  intervalMs = 300
): Promise<DiscoverStack | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stack = await getDiscoverStack(plugId);
    if (stack) return stack;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}
