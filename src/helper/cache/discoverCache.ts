import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DISCOVER_TTL = 6 * 60 * 60; // 6 hours
const LOCK_TTL = 20; // 20s

export interface DiscoverStack {
  ids: string[];
  createdAt: number;
}

export async function getDiscoverStack(plugId: string): Promise<DiscoverStack | null> {
  const raw = await redis.get<string>(`discover_stack_v10_${plugId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.ids)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setDiscoverStack(plugId: string, ids: string[]) {
  const stack: DiscoverStack = { ids, createdAt: Date.now() };
  await redis.set(`discover_stack_v10_${plugId}`, JSON.stringify(stack), {
    ex: DISCOVER_TTL,
  });
}

export async function acquireLock(plugId: string): Promise<boolean> {
  const res = await redis.set(`lock_discover_v10_${plugId}`, "locked", { nx: true, ex: LOCK_TTL });
  return res === "OK";
}

export async function releaseLock(plugId: string) {
  await redis.del(`lock_discover_v10_${plugId}`);
}

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
