import Redis from "ioredis";
import { env } from "@/lib/config/env";

/**
 * Shared Redis connection. Used for:
 *   - BullMQ job queues (billing, provisioning, telemetry)
 *   - Whitelabel configuration cache (dynamic branding without DB reads)
 *   - Distributed rate limiting for hypervisor API calls
 *
 * Connections are lazy: ioredis does not connect until the first command.
 */

/**
 * Bounded backoff. ioredis retries forever by default, which keeps a
 * serverless function alive (and floods it with error events) when Redis is
 * unreachable. Give up after 60 attempts so callers can fail fast.
 */
const retryStrategy = (times: number): number | null => {
  if (times > 60) return null;
  return Math.min(times * 100, 2000);
};

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy
});

// An 'error' event without a listener crashes the process; log instead.
redis.on("error", (error: Error) => {
  if (env.NODE_ENV !== "production") {
    console.error("[aetheris] redis connection error", error.message);
  }
});

export async function pingRedis(): Promise<void> {
  await redis.connect();
  await redis.ping();
  await redis.disconnect();
}
