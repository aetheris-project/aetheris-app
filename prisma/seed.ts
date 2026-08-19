/**
 * Prisma seed: starter plans and an example organization.
 * Run with `npx prisma db seed` (or npm run prisma:seed).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLANS = [
  {
    name: "Starter Container",
    monthlyPriceCents: 899,
    setupFeeCents: 0,
    limits: { vcpu: 1, memoryMb: 2048, diskMb: 20480 }
  },
  {
    name: "Standard Container",
    monthlyPriceCents: 2499,
    setupFeeCents: 0,
    limits: { vcpu: 2, memoryMb: 4096, diskMb: 40960 }
  },
  {
    name: "Performance VM",
    monthlyPriceCents: 9999,
    setupFeeCents: 0,
    limits: { vcpu: 4, memoryMb: 8192, diskMb: 81920 }
  }
] as const;

async function main(): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Default Organization",
      slug: "default",
      whitelabel: {
        create: {
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
            { label: "Documentation", href: "https://docs.aetheris.enterprise", cta: false },
            { label: "Open Console", href: "https://app.aetheris.enterprise", cta: true }
          ],
          emailTemplates: {},
          modules: {
            billing: true,
            vncConsole: true,
            pterodactyl: true,
            proxmox: true,
            virtfusion: true,
            registrars: true
          }
        }
      }
    }
  });

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { id: `seed-${plan.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: plan,
      create: {
        id: `seed-${plan.name.toLowerCase().replace(/\s+/g, "-")}`,
        organizationId: organization.id,
        ...plan
      }
    });
  }

  console.log(`seeded organization "${organization.slug}" and ${PLANS.length} plans`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
