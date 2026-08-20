"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

/* ------------------------------------------------------------------ */
/* Cron jobs                                                           */
/* ------------------------------------------------------------------ */

export interface CronJobInput {
  name: string;
  description?: string;
  schedule: string;
  task: string;
  enabled: boolean;
}

const CRON_TASKS = new Set([
  "backup",
  "invoice.dunning",
  "snapshot.prune",
  "sync.pterodactyl",
  "sync.proxmox",
  "sync.virtfusion",
  "report.daily"
]);

const CRON_RE = /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/;

export async function createCronJob(input: CronJobInput) {
  if (!input.name.trim()) return { ok: false, error: "Name is required." };
  if (!CRON_RE.test(input.schedule)) {
    return { ok: false, error: "Schedule must be a valid cron(5) expression (5 fields)." };
  }
  if (!CRON_TASKS.has(input.task)) {
    return { ok: false, error: `Unknown task '${input.task}'.` };
  }
  await prisma.cronJob.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      schedule: input.schedule.trim(),
      task: input.task,
      enabled: input.enabled
    }
  });
  revalidatePath("/admin/cron");
  return { ok: true };
}

export async function toggleCronJob(id: string, enabled: boolean) {
  await prisma.cronJob.update({ where: { id }, data: { enabled } });
  revalidatePath("/admin/cron");
  return { ok: true };
}

export async function deleteCronJob(id: string) {
  await prisma.cronJob.delete({ where: { id } });
  revalidatePath("/admin/cron");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* SFTP users                                                          */
/* ------------------------------------------------------------------ */

export interface SftpUserInput {
  serverId: string;
  username: string;
  homePath: string;
  enabled: boolean;
}

const USERNAME_RE = /^[a-z][a-z0-9_]{1,31}$/;

export async function createSftpUser(input: SftpUserInput) {
  if (!input.serverId.trim()) return { ok: false, error: "Server is required." };
  if (!USERNAME_RE.test(input.username)) {
    return {
      ok: false,
      error: "Username must start with a letter and contain only lowercase letters, digits and underscores (2-32 chars)."
    };
  }
  const server = await prisma.server.findUnique({ where: { id: input.serverId } });
  if (!server) return { ok: false, error: "Server not found." };
  try {
    await prisma.sftpUser.create({
      data: {
        serverId: input.serverId,
        username: input.username,
        homePath: input.homePath.trim() || "/home/container",
        enabled: input.enabled
      }
    });
  } catch (error) {
    return { ok: false, error: "An SFTP user with this name already exists on this server." };
  }
  revalidatePath("/admin/sftp");
  return { ok: true };
}

export async function toggleSftpUser(id: string, enabled: boolean) {
  await prisma.sftpUser.update({ where: { id }, data: { enabled } });
  revalidatePath("/admin/sftp");
  return { ok: true };
}

export async function deleteSftpUser(id: string) {
  await prisma.sftpUser.delete({ where: { id } });
  revalidatePath("/admin/sftp");
  return { ok: true };
}
