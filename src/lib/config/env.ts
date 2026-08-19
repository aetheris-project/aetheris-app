/**
 * Centralized, validated environment configuration.
 *
 * Every process (web, workers, installer hooks) reads configuration through
 * this module, so a typo in an environment variable fails fast at boot with
 * a precise message instead of surfacing as a runtime mystery.
 */

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  AETHERIS_APP_URL: z.string().url().default("http://localhost:3000"),
  AETHERIS_SECRET: z.string().min(32, "AETHERIS_SECRET must be at least 32 characters"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),

  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  MOLLIE_API_KEY: z.string().optional(),

  PTERODACTYL_URL: z.string().url().optional(),
  PTERODACTYL_APP_API_KEY: z.string().optional(),
  PTERODACTYL_CLIENT_API_KEY: z.string().optional(),

  PROXMOX_URL: z.string().url().optional(),
  PROXMOX_USER: z.string().optional(),
  PROXMOX_PASSWORD: z.string().optional(),
  PROXMOX_VERIFY_TLS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),

  VIRTFUSION_URL: z.string().url().optional(),
  VIRTFUSION_API_KEY: z.string().optional(),

  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),

  NAMECHEAP_API_USER: z.string().optional(),
  NAMECHEAP_API_KEY: z.string().optional(),

  BULLMQ_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(8)
});

export type AetherisEnv = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env: AetherisEnv = parsed.data;
