// helper/cache/discoverRedis.ts
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TTL_SECONDS = Number(process.env.DISCOVER_CACHE_TTL_SECONDS || 6 * 60 * 60); // default 6 hours
const LOCK_TTL = Number(process.env.DISCOVER_CACHE_LOCK_TTL || 30); // seconds
const KEY_PREFIX = process.env.CACHE_KEY_PREFIX || "discover_stack_v1_";

type DiscoverStack = { ids: string[]; createdAt: number };

export async function getDiscoverStack(plugId: string): Promise<DiscoverStack | null> {
  const key = KEY_PREFIX + plugId;
  const raw = await redis.get<string | null>(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DiscoverStack;
    return parsed;
  } catch {
    // malformed, delete key
    await redis.del(key);
    return null;
  }
}

export async function setDiscoverStack(plugId: string, ids: string[], ttlSeconds = TTL_SECONDS) {
  const key = KEY_PREFIX + plugId;
  const payload = JSON.stringify({ ids, createdAt: Date.now() });
  // set with expiry, does NOT refresh TTL on reads
  await redis.set(key, payload, { ex: ttlSeconds });
}

export async function deleteDiscoverStack(plugId: string) {
  const key = KEY_PREFIX + plugId;
  await redis.del(key);
}

// Simple lock to prevent concurrent builds.
// lockKey = `${KEY_PREFIX}${plugId}:lock`
// returns true if lock acquired
export async function acquireLock(plugId: string, lockTtlSeconds = LOCK_TTL): Promise<boolean> {
  const lockKey = KEY_PREFIX + plugId + ":lock";
  // NX: only set if not exists, EX: expiration seconds
  const ok = await redis.set(lockKey, "1", { nx: true, ex: lockTtlSeconds });
  return Boolean(ok); // Upstash returns "OK"/null or true/false depending — cast to boolean
}

export async function releaseLock(plugId: string) {
  const lockKey = KEY_PREFIX + plugId + ":lock";
  await redis.del(lockKey);
}

// wait until stack exists or until timeout (ms)
export async function waitForStack(plugId: string, timeoutMs = 7000, pollIntervalMs = 300): Promise<DiscoverStack | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await getDiscoverStack(plugId);
    if (s) return s;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return null;
}
