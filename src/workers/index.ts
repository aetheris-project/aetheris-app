/**
 * Aetheris background workers.
 *
 * Entrypoint for the `aetheris-worker` systemd unit / `npm run worker`.
 * Wires the BullMQ queues declared in src/lib/queue.ts to their processors.
 * Run one instance per host; queues are distributed by Redis.
 */

import { createWorker, QUEUE_NAMES, type Job } from "@/lib/queue";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";

// Placeholder processors. Each queue processor should be extracted into
// src/workers/<domain>.ts as it grows; the wiring below is the contract.
import type { BillingJobData, EmailJobData, ProvisionJobData, TelemetryJobData } from "@/lib/queue";

async function provisionProcessor(job: Job<ProvisionJobData>) {
  console.log(`[provisioning] job ${job.id}: server ${job.data.serverId}`);
  return { ok: true };
}

async function billingProcessor(job: Job<BillingJobData>) {
  console.log(`[billing] job ${job.id}: invoice ${job.data.invoiceId} action=${job.data.action}`);
  return { ok: true };
}

async function telemetryProcessor(job: Job<TelemetryJobData>) {
  console.log(`[telemetry] job ${job.id}: server ${job.data.serverId}`);
  return { ok: true };
}

async function emailProcessor(job: Job<EmailJobData>) {
  console.log(`[email] job ${job.id}: template ${job.data.templateKey} to ${job.data.to}`);
  return { ok: true };
}

const workers = [
  createWorker<ProvisionJobData>(QUEUE_NAMES.provisioning, provisionProcessor),
  createWorker<BillingJobData>(QUEUE_NAMES.billing, billingProcessor),
  createWorker<TelemetryJobData>(QUEUE_NAMES.telemetry, telemetryProcessor),
  createWorker<EmailJobData>(QUEUE_NAMES.email, emailProcessor)
];

console.log(
  `[aetheris] workers started: concurrency=${env.BULLMQ_CONCURRENCY} queues=${workers.length}`
);

async function shutdown(signal: string): Promise<void> {
  console.log(`[aetheris] received ${signal}; closing workers`);
  await Promise.all(workers.map((worker) => worker.close()));
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
