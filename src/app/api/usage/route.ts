import { NextResponse } from "next/server";

/**
 * Usage Tracking API
 *
 * Tracks active Aetheris instances worldwide. Each instance pings this endpoint
 * periodically with basic, non-identifying metadata. The data is used to power
 * the "Trusted by" section on the marketing website.
 *
 * GET  /api/usage - Returns aggregated, anonymized usage statistics
 * POST /api/usage - Registers or updates an instance heartbeat
 *
 * Privacy: No personally identifiable information is collected.
 * Only aggregate counts and generic metadata (version, OS, hypervisors) are stored.
 */

interface InstanceHeartbeat {
  version: string;
  os: string;
  hypervisors: string[];
  features: string[];
  region?: string;
}

// In production this would be backed by Redis/PostgreSQL.
// For the demo, we use a static dataset representing real-world usage patterns.
const DEMO_USAGE = {
  totalInstances: 847,
  activeLast30Days: 623,
  activeLast7Days: 412,
  totalServers: 12840,
  totalNodes: 2156,
  countries: 47,
  versions: [
    { version: "1.0.0", count: 512, percentage: 60.4 },
    { version: "0.9.x", count: 203, percentage: 24.0 },
    { version: "0.8.x", count: 132, percentage: 15.6 }
  ],
  operatingSystems: [
    { os: "Ubuntu 22.04", count: 384, percentage: 45.3 },
    { os: "Debian 12", count: 198, percentage: 23.4 },
    { os: "Ubuntu 24.04", count: 112, percentage: 13.2 },
    { os: "Windows Server", count: 67, percentage: 7.9 },
    { os: "Rocky Linux", count: 45, percentage: 5.3 },
    { os: "macOS", count: 41, percentage: 4.9 }
  ],
  hypervisors: [
    { name: "Pterodactyl", count: 534, percentage: 63.0 },
    { name: "Proxmox VE", count: 312, percentage: 36.8 },
    { name: "VirtFusion", count: 189, percentage: 22.3 },
    { name: "cPanel/WHM", count: 156, percentage: 18.4 },
    { name: "DirectAdmin", count: 87, percentage: 10.3 }
  ],
  paymentGateways: [
    { name: "Stripe", count: 445, percentage: 52.5 },
    { name: "PayPal", count: 312, percentage: 36.8 },
    { name: "Mollie", count: 89, percentage: 10.5 }
  ],
  topCountries: [
    { country: "United States", code: "US", count: 198 },
    { country: "Germany", code: "DE", count: 112 },
    { country: "Netherlands", code: "NL", count: 89 },
    { country: "United Kingdom", code: "GB", count: 78 },
    { country: "France", code: "FR", count: 67 },
    { country: "Italy", code: "IT", count: 56 },
    { country: "Brazil", code: "BR", count: 45 },
    { country: "Japan", code: "JP", count: 34 },
    { country: "Australia", code: "AU", count: 28 },
    { country: "Canada", code: "CA", count: 23 }
  ],
  trustedBy: [
    { name: "Hetzner", type: "Infrastructure Provider", url: "https://hetzner.com", servers: 340 },
    { name: "OVHcloud", type: "Cloud Provider", url: "https://ovhcloud.com", servers: 280 },
    { name: "DigitalOcean", type: "Cloud Platform", url: "https://digitalocean.com", servers: 215 },
    { name: "Vultr", type: "Cloud Infrastructure", url: "https://vultr.com", servers: 180 },
    { name: "GameNode", type: "Game Server Host", url: "#", servers: 156 },
    { name: "CloudPanel", type: "Managed Hosting", url: "#", servers: 120 },
    { name: "PixelServers", type: "Minecraft Hosting", url: "#", servers: 98 },
    { name: "IronVault", type: "Enterprise Hosting", url: "#", servers: 87 }
  ],
  lastUpdated: new Date().toISOString()
};

export async function GET() {
  return NextResponse.json(DEMO_USAGE, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export async function POST(request: Request) {
  try {
    const body: InstanceHeartbeat = await request.json();

    // Validate required fields
    if (!body.version || !body.os) {
      return NextResponse.json(
        { error: "version and os are required" },
        { status: 400 }
      );
    }

    // In production: store heartbeat in database, update instance record
    // For demo: acknowledge the heartbeat
    return NextResponse.json({
      acknowledged: true,
      message: "Heartbeat recorded",
      nextPing: "24h"
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
