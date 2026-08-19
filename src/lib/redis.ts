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
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: true,
  lazyConnect: true
});

export async function pingRedis(): Promise<void> {
  await redis.connect();
  await redis.ping();
  await redis.disconnect();
}
