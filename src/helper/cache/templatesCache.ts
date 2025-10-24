// src/utils/redis-template-cache.ts
import { Redis } from "@upstash/redis";
import { upstashRedisRestUrl, upstashRedisRestToken } from "../../config";
import fs from "fs/promises";
import path from "path";

export const redis = new Redis({
  url: upstashRedisRestUrl,
  token: upstashRedisRestToken,
});
// 🕒 1 year TTL
const TEMPLATE_TTL = 60 * 60 * 24 * 365;
const BASE_KEY = "template_cache_v1"; // version key in case you change logic later

// 👇 Each plug has only 1 active cached template at a time
export async function getTemplateCache(
  plugId: string
): Promise<{ content: string; contentType: string } | null> {
  const raw = await redis.get(`${BASE_KEY}:${plugId}`);
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as { content: string; contentType: string };
    } catch {
      return null; // malformed JSON
    }
  }

  // in case Upstash returns object (rare)
  if (typeof raw === "object" && raw !== null && "content" in raw && "contentType" in raw) {
    return raw as { content: string; contentType: string };
  }

  return null;
}


export async function setTemplateCache(plugId: string, content: string, contentType: string) {
  await redis.set(
    `${BASE_KEY}:${plugId}`,
    JSON.stringify({ content, contentType }),
    { ex: TEMPLATE_TTL }
  );
}

export async function deleteTemplateCache(plugId: string) {
  await redis.del(`${BASE_KEY}:${plugId}`);
}
