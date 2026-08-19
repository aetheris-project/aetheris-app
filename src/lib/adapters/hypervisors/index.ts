/**
 * Hypervisor driver registry.
 *
 * Factory that constructs the correct driver from validated configuration.
 * The Admin Panel persists encrypted driver configs (HypervisorCredential
 * rows); this module decrypts, validates with zod, and returns a driver
 * instance ready to serve requests.
 */

import { z } from "zod";
import type { HypervisorConfig, HypervisorDriver, HypervisorKind } from "./types";
import { HypervisorDriverError } from "./types";
import { PterodactylDriver } from "./pterodactyl";
import { ProxmoxDriver } from "./proxmox";
import { VirtFusionDriver } from "./virtfusion";

// ---------------------------------------------------------------------------
// Per-kind zod schemas (mirror the config interfaces in types.ts)
// ---------------------------------------------------------------------------

const baseSchema = z.object({
  name: z.string().min(1),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
  rateLimitRps: z.number().positive().max(100).optional()
});

const pterodactylSchema = baseSchema.extend({
  kind: z.literal("pterodactyl"),
  baseUrl: z.string().url(),
  applicationApiKey: z.string().min(10),
  clientApiKey: z.string().min(10)
});

const proxmoxSchema = baseSchema.extend({
  kind: z.literal("proxmox"),
  baseUrl: z.string().url(),
  user: z.string().min(1),
  password: z.string().min(1),
  verifyTls: z.boolean().default(true),
  storage: z.string().min(1)
});

const virtfusionSchema = baseSchema.extend({
  kind: z.literal("virtfusion"),
  baseUrl: z.string().url(),
  apiKey: z.string().min(10)
});

export const hypervisorConfigSchema = z.discriminatedUnion("kind", [
  pterodactylSchema,
  proxmoxSchema,
  virtfusionSchema
]);

export type ValidatedHypervisorConfig = z.infer<typeof hypervisorConfigSchema>;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a driver from a raw (possibly untrusted) config object.
 * Throws a zod error listing every invalid field on failure.
 */
export function createDriver(rawConfig: unknown): HypervisorDriver {
  const config = hypervisorConfigSchema.parse(rawConfig);
  return instantiate(config);
}

function instantiate(config: ValidatedHypervisorConfig): HypervisorDriver {
  switch (config.kind) {
    case "pterodactyl":
      return new PterodactylDriver(config);
    case "proxmox":
      return new ProxmoxDriver(config);
    case "virtfusion":
      return new VirtFusionDriver(config);
  }
}

/** Validate a config without instantiating a driver (used by the Admin Panel). */
export function validateConfig(rawConfig: unknown): ValidatedHypervisorConfig {
  return hypervisorConfigSchema.parse(rawConfig);
}

// ---------------------------------------------------------------------------
// Persistence helpers (HypervisorCredential rows)
// ---------------------------------------------------------------------------

/**
 * Rehydrate drivers for an organization from its persisted credentials.
 * `decrypt` is injected so this module stays free of crypto concerns; the
 * production implementation lives in src/lib/crypto.ts (AES-256-GCM).
 */
export async function driversFromCredentials(
  rows: Array<{ kind: HypervisorKind; name: string; configEncrypted: string }>,
  decrypt: (payload: string) => Promise<string>
): Promise<HypervisorDriver[]> {
  const drivers: HypervisorDriver[] = [];
  for (const row of rows) {
    try {
      const plaintext = await decrypt(row.configEncrypted);
      drivers.push(createDriver({ kind: row.kind, name: row.name, ...JSON.parse(plaintext) }));
    } catch (cause) {
      throw new HypervisorDriverError({
        kind: row.kind,
        code: "VALIDATION",
        message: `[${row.name}] stored configuration could not be loaded`,
        cause
      });
    }
  }
  return drivers;
}
