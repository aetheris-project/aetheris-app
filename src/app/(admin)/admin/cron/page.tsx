import type { Metadata } from "next";
import { CalendarClock, Clock, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { demoCronJobs } from "@/lib/demo-data";
import { createCronJob, deleteCronJob, toggleCronJob } from "@/app/(admin)/admin/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scheduled tasks"
};

const TASKS = [
  { id: "backup", label: "Backup" },
  { id: "invoice.dunning", label: "Invoice dunning" },
  { id: "snapshot.prune", label: "Snapshot prune" },
  { id: "sync.pterodactyl", label: "Sync Pterodactyl" },
  { id: "sync.proxmox", label: "Sync Proxmox" },
  { id: "sync.virtfusion", label: "Sync VirtFusion" },
  { id: "report.daily", label: "Daily report" }
];

function humanSchedule(schedule: string): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return schedule;
  const minute = parts[0] ?? "*";
  const hour = parts[1] ?? "*";
  const dom = parts[2] ?? "*";
  const month = parts[3] ?? "*";
  const dow = parts[4] ?? "*";
  if (minute === "0" && hour !== "*") return `daily at ${hour.padStart(2, "0")}:00`;
  if (minute === "0" && hour === "*") return "hourly";
  if (minute === "*" && hour === "*") return "every minute";
  if (dow !== "*" && dom === "*" && month === "*") {
    return `every ${dow === "0" ? "Sunday" : dow} at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }
  return `${minute} ${hour} ${dom} ${month} ${dow}`;
}

export default async function AdminCronPage() {
  let jobs;
  try {
    jobs = await prisma.cronJob.findMany({ orderBy: { createdAt: "asc" } });
  } catch {
    jobs = demoCronJobs;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="aetheris-kicker">Admin</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Scheduled tasks</h1>
          <p className="mt-2 text-sm text-muted">
            Cron jobs executed by the control panel worker (BullMQ schedule).
          </p>
        </div>
      </div>

      {/* Create form */}
      <form
        action={async (formData: FormData) => {
          "use server";
          await createCronJob({
            name: String(formData.get("name") ?? ""),
            description: String(formData.get("description") ?? ""),
            schedule: String(formData.get("schedule") ?? "0 3 * * *"),
            task: String(formData.get("task") ?? "backup"),
            enabled: formData.get("enabled") === "on"
          });
        }}
        className="mt-8 grid gap-3 rounded-2xl border border-edge bg-raised/30 p-5 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="cron-name" className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Name
          </label>
          <input
            id="cron-name"
            name="name"
            required
            placeholder="Nightly backups"
            className="h-9 rounded-lg border border-edge bg-base px-3 text-sm text-ink outline-none transition-colors focus:border-accent/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cron-schedule" className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Cron schedule
          </label>
          <input
            id="cron-schedule"
            name="schedule"
            required
            defaultValue="0 3 * * *"
            placeholder="0 3 * * *"
            className="h-9 rounded-lg border border-edge bg-base px-3 font-mono text-sm text-ink outline-none transition-colors focus:border-accent/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cron-task" className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Task
          </label>
          <select
            id="cron-task"
            name="task"
            defaultValue="backup"
            className="h-9 rounded-lg border border-edge bg-base px-3 text-sm text-ink outline-none transition-colors focus:border-accent/50"
          >
            {TASKS.map((task) => (
              <option key={task.id} value={task.id}>
                {task.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cron-desc" className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Description
          </label>
          <input
            id="cron-desc"
            name="description"
            placeholder="Optional note"
            className="h-9 rounded-lg border border-edge bg-base px-3 text-sm text-ink outline-none transition-colors focus:border-accent/50"
          />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex h-9 items-center gap-2 text-xs text-muted">
            <input type="checkbox" name="enabled" defaultChecked className="accent-[var(--aetheris-accent)]" />
            Enabled
          </label>
          <button type="submit" className="aetheris-btn-primary ml-auto h-9 px-4">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>
        </div>
      </form>

      {/* Job list */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-edge">
        <div className="flex items-center justify-between border-b border-edge bg-raised/40 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <CalendarClock className="h-4 w-4 text-accent" aria-hidden="true" />
            Job list
          </span>
          <span className="text-xs text-faint">{jobs.length} total</span>
        </div>

        {jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <Clock className="h-8 w-8 text-faint" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">No scheduled tasks yet</p>
            <p className="max-w-sm text-xs text-muted">
              Add a cron job above — for example a nightly backup at <code className="font-mono">0 3 * * *</code>.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-edge">
            {jobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{job.name}</span>
                    <span className="inline-flex h-5 items-center rounded-full border border-edge bg-raised px-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                      {job.task}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="font-mono text-[11px]">{job.schedule}</span>
                    <span className="text-faint">→</span>
                    <span className="text-[11px]">{humanSchedule(job.schedule)}</span>
                    {job.description && <span className="text-faint">· {job.description}</span>}
                  </div>
                  <div className="mt-1 text-[11px] text-faint">
                    {job.lastRunAt
                      ? `Last run ${job.lastRunAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} · ${job.lastStatus ?? "pending"}`
                      : "Never run"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await toggleCronJob(job.id, !job.enabled);
                    }}
                  >
                    <button
                      type="submit"
                      className={`inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-medium transition-colors ${
                        job.enabled
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-edge bg-raised text-muted"
                      }`}
                    >
                      {job.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await deleteCronJob(job.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-edge px-2.5 text-[11px] text-muted transition-colors hover:border-danger/50 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
