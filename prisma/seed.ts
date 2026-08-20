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
            tagline: "Billing and virtualization control panel for the enterprise",
            logoUrl: "/brand/aetheris-mark.svg",
            logoDarkUrl: "/brand/aetheris-mark.svg",
            domain: "aetheris.enterprise"
          },
          theme: { accent: "emerald", radius: 10, fontFamily: "" },
          navigation: [
            { label: "Product", href: "#product", cta: false },
            { label: "Documentation", href: "https://aetheris-docs.vercel.app", cta: false },
            { label: "Open Console", href: "https://aetheris-app.vercel.app", cta: true }
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

  const CRON_JOBS: Array<{ name: string; description: string; schedule: string; task: string; enabled?: boolean }> = [
    { name: "Nightly backups", description: "Snapshot every server and prune old backups", schedule: "0 3 * * *", task: "backup" },
    { name: "Invoice dunning", description: "Send payment reminders for pending and overdue invoices", schedule: "0 9 * * *", task: "invoice.dunning" },
    { name: "Snapshot prune", description: "Remove backups past retention", schedule: "30 4 * * *", task: "snapshot.prune" },
    { name: "Pterodactyl sync", description: "Reconcile server state with the Pterodactyl panel", schedule: "*/15 * * * *", task: "sync.pterodactyl" },
    { name: "Proxmox sync", description: "Reconcile nodes and VMs with Proxmox VE", schedule: "*/10 * * * *", task: "sync.proxmox" },
    { name: "Daily report", description: "Compile and deliver the daily operations report", schedule: "0 7 * * *", task: "report.daily", enabled: false }
  ];

  for (const job of CRON_JOBS) {
    await prisma.cronJob.upsert({
      where: { id: `seed-${job.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: { schedule: job.schedule, task: job.task, enabled: job.enabled ?? true, description: job.description },
      create: {
        id: `seed-${job.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: job.name,
        description: job.description,
        schedule: job.schedule,
        task: job.task,
        enabled: job.enabled ?? true
      }
    });
  }

  console.log(`seeded organization "${organization.slug}", ${PLANS.length} plans and ${CRON_JOBS.length} cron jobs`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
