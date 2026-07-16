import "server-only";
import { Redis } from "@upstash/redis";

const CACHE_PREFIX = "kanxi-next";
let redisClient = undefined;

function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return "";
}

function buildRedis() {
  const url = envValue("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
  const token = envValue("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_READ_ONLY_TOKEN");
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getRedis() {
  if (redisClient !== undefined) return redisClient;
  redisClient = buildRedis();
  return redisClient;
}

export function upstashEnabled() {
  return Boolean(getRedis());
}

export function cacheKey(scope, key) {
  return `${CACHE_PREFIX}:${scope}:${String(key || "").trim()}`;
}

export async function readCacheJson(scope, key) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return (await redis.get(cacheKey(scope, key))) || null;
  } catch (error) {
    console.warn("Upstash read failed:", error?.message || error);
    return null;
  }
}

export async function writeCacheJson(scope, key, value, ttlSeconds = 60) {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const namespaced = cacheKey(scope, key);
    if (ttlSeconds > 0) {
      await redis.set(namespaced, value, { ex: ttlSeconds });
    } else {
      await redis.set(namespaced, value);
    }
    return true;
  } catch (error) {
    console.warn("Upstash write failed:", error?.message || error);
    return false;
  }
}

export async function deleteCacheKeys(keys = []) {
  const redis = getRedis();
  if (!redis || !keys.length) return false;
  try {
    await redis.del(...keys.map((key) => cacheKey("route", key)));
    return true;
  } catch (error) {
    console.warn("Upstash delete failed:", error?.message || error);
    return false;
  }
}

export async function flushStorefrontCache() {
  const redis = getRedis();
  if (!redis) return false;
  try {
    let cursor = 0;
    const patterns = [`${CACHE_PREFIX}:route:*`, `${CACHE_PREFIX}:full:*`];
    for (const pattern of patterns) {
      cursor = 0;
      do {
        const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 200 });
        cursor = Number(nextCursor || 0);
        if (Array.isArray(keys) && keys.length) {
          await redis.del(...keys);
        }
      } while (cursor !== 0);
    }
    return true;
  } catch (error) {
    console.warn("Upstash flush failed:", error?.message || error);
    return false;
  }
}

