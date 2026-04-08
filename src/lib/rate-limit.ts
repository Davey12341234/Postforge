import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

const redis = getRedis();

export const rateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: true,
      prefix: "ratelimit:generate",
    })
  : null;

/** In-memory fallback when Upstash is not configured (local dev). */
const memoryHits = new Map<string, { count: number; resetAt: number }>();

export async function limitGenerate(userId: string) {
  const key = `generate:${userId}`;
  if (rateLimit) {
    return rateLimit.limit(key);
  }
  const now = Date.now();
  const windowMs = 60_000;
  const max = 10;
  const cur = memoryHits.get(key);
  if (!cur || now > cur.resetAt) {
    memoryHits.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      limit: max,
      remaining: max - 1,
      reset: now + windowMs,
    };
  }
  if (cur.count >= max) {
    return {
      success: false,
      limit: max,
      remaining: 0,
      reset: cur.resetAt,
    };
  }
  cur.count += 1;
  return {
    success: true,
    limit: max,
    remaining: max - cur.count,
    reset: cur.resetAt,
  };
}
