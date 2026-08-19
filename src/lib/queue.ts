import { Queue, Worker } from "bullmq";
import type { Job, Processor } from "bullmq";
import { env } from "@/lib/config/env";
import { redis } from "@/lib/redis";

export const QUEUE_NAMES = {
  billing: "aetheris.billing",
  provisioning: "aetheris.provisioning",
  telemetry: "aetheris.telemetry",
  email: "aetheris.email",
  webhooks: "aetheris.webhooks"
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

interface QueueOptions {
  defaultJobOptions: {
    attempts: number;
    backoff: { type: "exponential"; delay: number };
    removeOnComplete: { count: 500 };
    removeOnFail: { count: 5000 };
  };
}

const DEFAULT_OPTIONS: QueueOptions = {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 5000 }
  }
};

export function getQueue(name: QueueName): Queue {
  return new Queue(name, {
    connection: redis,
    ...DEFAULT_OPTIONS
  });
}

export function createWorker<Data = unknown, Result = unknown>(
  name: QueueName,
  processor: Processor<Data, Result, string>
): Worker<Data, Result, string> {
  return new Worker<Data, Result, string>(name, processor, {
    connection: redis,
    concurrency: env.BULLMQ_CONCURRENCY
  });
}

export type { Job };

/** Well-known job payloads (typed contracts for the worker code). */

export interface ProvisionJobData {
  organizationId: string;
  serverId: string;
  planId: string;
  nodeId: string;
}

export interface BillingJobData {
  invoiceId: string;
  action: "charge" | "dunning" | "finalize";
}

export interface TelemetryJobData {
  serverId: string;
}

export interface EmailJobData {
  templateKey: string;
  to: string;
  variables: Record<string, string>;
}
