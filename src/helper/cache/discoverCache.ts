import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 6 hours cache TTL
const DISCOVER_TTL = 6 * 60 * 60; // seconds
const LOCK_TTL = 20; // lock expires after 20s

export interface DiscoverStack {
  ids: string[];
  createdAt: number;
}

// 🧩 Get stack
export async function getDiscoverStack(plugId: string): Promise<DiscoverStack | null> {
  const raw = await redis.get<string>(`discover_stack_${plugId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// 💾 Save stack with TTL
export async function setDiscoverStack(plugId: string, ids: string[]) {
  const stack: DiscoverStack = { ids, createdAt: Date.now() };
  await redis.set(`discover_stack_${plugId}`, JSON.stringify(stack), { ex: DISCOVER_TTL });
}

// 🔒 Acquire lock to prevent double generation
export async function acquireLock(plugId: string): Promise<boolean> {
  const lockKey = `lock_discover_${plugId}`;
  const res = await redis.set(lockKey, "locked", { nx: true, ex: LOCK_TTL });
  return res === "OK";
}

// 🔓 Release lock
export async function releaseLock(plugId: string) {
  await redis.del(`lock_discover_${plugId}`);
}

// ⏳ Wait for stack (poll up to `timeoutMs`)
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
