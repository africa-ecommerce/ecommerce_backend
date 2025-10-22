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

// 🧠 Get cached stack
export async function getDiscoverStack(plugId: string): Promise<DiscoverStack | null> {
  const raw = await redis.get(`discover_stack_v10_${plugId}`);
  if (!raw) return null;

  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!parsed || !Array.isArray(parsed.ids)) return null;
  return parsed;
}

// 💾 Save stack with TTL
export async function setDiscoverStack(plugId: string, ids: string[]) {
  const stack: DiscoverStack = { ids, createdAt: Date.now() };
  await redis.set(`discover_stack_v10_${plugId}`, JSON.stringify(stack), { ex: DISCOVER_TTL });
}

// 🔒 Prevent multiple concurrent stack builds
export async function acquireLock(plugId: string): Promise<boolean> {
  const res = await redis.set(`lock_discover_v10_${plugId}`, "locked", { nx: true, ex: LOCK_TTL });
  return res === "OK";
}

// 🔓 Release lock
export async function releaseLock(plugId: string) {
  await redis.del(`lock_discover_v10_${plugId}`);
}

// ⏳ Wait if another instance is building the stack
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
