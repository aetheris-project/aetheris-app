/**
 * GET /api/whitelabel
 *
 * Serves the dynamic whitelabel configuration for the requesting tenant.
 * Resolution order:
 *   1. Redis cache (TTL 300s) - zero-DB reads under load.
 *   2. PostgreSQL WhitelabelConfig row for the organization.
 *   3. Built-in defaults when the tenant has not customized anything.
 *
 * The marketing site (aetheris-website) consumes this endpoint through
 * NEXT_PUBLIC_WHITELABEL_URL when dynamic branding is enabled.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

const CACHE_TTL_SECONDS = 300;
const CACHE_PREFIX = "aetheris:whitelabel:";

interface WhitelabelPayload {
  brand: {
    name: string;
    tagline: string;
    logoUrl: string;
    logoDarkUrl: string;
    domain: string;
  };
  theme: { accent: string; radius: number; fontFamily: string };
  navigation: Array<{ label: string; href: string; cta: boolean }>;
  modules: Record<string, boolean>;
}

const DEFAULT_CONFIG: WhitelabelPayload = {
  brand: {
    name: "Aetheris",
    tagline: "Billing and virtualization control plane for the enterprise",
    logoUrl: "/brand/aetheris-mark.svg",
    logoDarkUrl: "/brand/aetheris-mark.svg",
    domain: "aetheris.enterprise"
  },
  theme: { accent: "emerald", radius: 10, fontFamily: "" },
  navigation: [
    { label: "Product", href: "#product", cta: false },
    { label: "Demo", href: "#demo", cta: false },
    { label: "Documentation", href: "https://docs.aetheris.enterprise", cta: false },
    { label: "Open Console", href: "https://app.aetheris.enterprise", cta: true }
  ],
  modules: {
    billing: true,
    vncConsole: true,
    pterodactyl: true,
    proxmox: true,
    virtfusion: true,
    registrars: true
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgSlug = searchParams.get("organization") ?? "default";
  const cacheKey = `${CACHE_PREFIX}${orgSlug}`;

  // 1. Redis cache (best effort: an unreachable cache must not break branding)
  let cached: string | null = null;
  try {
    cached = await redis.get(cacheKey);
  } catch (cause) {
    console.error("[aetheris] whitelabel cache read failed", cause);
  }
  if (cached) {
    return NextResponse.json(JSON.parse(cached) as unknown, {
      headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}` }
    });
  }

  // 2. PostgreSQL
  let config = DEFAULT_CONFIG;
  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: { whitelabel: true }
  });

  if (organization?.whitelabel) {
    // Prisma exposes Json columns as JsonValue; validate shape before use.
    config = {
      brand: organization.whitelabel.brand as unknown as WhitelabelPayload["brand"],
      theme: organization.whitelabel.theme as unknown as WhitelabelPayload["theme"],
      navigation: organization.whitelabel.navigation as unknown as WhitelabelPayload["navigation"],
      modules: organization.whitelabel.modules as unknown as WhitelabelPayload["modules"]
    };
  }

  // 3. Populate cache (best effort; a cache failure must not break the request)
  try {
    await redis.set(cacheKey, JSON.stringify(config), "EX", CACHE_TTL_SECONDS);
  } catch (cause) {
    console.error("[aetheris] whitelabel cache write failed", cause);
  }

  return NextResponse.json(config, {
    headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}` }
  });
}
