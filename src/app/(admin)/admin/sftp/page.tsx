import type { Metadata } from "next";
import { FolderLock, KeyRound, Plus, Trash2, UserRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { demoClientServers, demoSftpUsers } from "@/lib/demo-data";
import { createSftpUser, deleteSftpUser, toggleSftpUser } from "@/app/(admin)/admin/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SFTP users"
};

export default async function AdminSftpPage() {
  let users;
  let servers;
  try {
    const [fetchedUsers, fetchedServers] = await Promise.all([
      prisma.sftpUser.findMany({
        include: { server: { select: { id: true, name: true, ipv4: true } } },
        orderBy: { createdAt: "asc" }
      }),
      prisma.server.findMany({
        where: { state: { not: "terminated" } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, ipv4: true }
      })
    ]);
    users = fetchedUsers;
    servers = fetchedServers;
  } catch {
    users = demoSftpUsers;
    servers = demoClientServers.map((server) => ({
      id: server.id,
      name: server.name,
      ipv4: server.ipv4
    }));
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="aetheris-kicker">Admin</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">SFTP users</h1>
          <p className="mt-2 text-sm text-muted">
            File access accounts scoped to a single server. Every user is jailed
            to its home path; credentials are provisioned by the SFTP driver.
          </p>
        </div>
      </div>

      {/* Create form */}
      <form
        action={async (formData: FormData) => {
          "use server";
          await createSftpUser({
            serverId: String(formData.get("serverId") ?? ""),
            username: String(formData.get("username") ?? ""),
            homePath: String(formData.get("homePath") ?? "/home/container"),
            enabled: formData.get("enabled") === "on"
          });
        }}
        className="mt-8 grid gap-3 rounded-2xl border border-edge bg-surface/70 p-5 shadow-[0_18px_40px_-28px_rgb(0_0_0/0.7)] backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="sftp-server" className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Server
          </label>
          <select
            id="sftp-server"
            name="serverId"
            required
            className="h-9 rounded-lg border border-edge bg-base/80 px-3 text-sm text-ink outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          >
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name} ({server.ipv4 ?? "no ip"})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sftp-username" className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Username
          </label>
          <input
            id="sftp-username"
            name="username"
            required
            placeholder="webuser"
            pattern="[a-z][a-z0-9_]{1,31}"
            className="h-9 rounded-lg border border-edge bg-base/80 px-3 font-mono text-sm text-ink outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sftp-home" className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Home path
          </label>
          <input
            id="sftp-home"
            name="homePath"
            defaultValue="/home/container"
            className="h-9 rounded-lg border border-edge bg-base/80 px-3 font-mono text-sm text-ink outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Options
          </label>
          <label className="flex h-9 items-center gap-2 text-xs text-muted">
            <input type="checkbox" name="enabled" defaultChecked className="accent-[var(--aetheris-accent)]" />
            Enabled
          </label>
        </div>
        <div className="flex items-end">
          <button type="submit" className="aetheris-btn-primary h-9 w-full px-4">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create user
          </button>
        </div>
      </form>

      {/* Users list */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-edge">
        <div className="flex items-center justify-between border-b border-edge bg-raised/40 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <FolderLock className="h-4 w-4 text-accent" aria-hidden="true" />
            Provisioned users
          </span>
          <span className="text-xs text-faint">{users.length} total</span>
        </div>

        {users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <KeyRound className="h-8 w-8 text-faint" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">No SFTP users yet</p>
            <p className="max-w-sm text-xs text-muted">
              Create the first file access account above to let a client upload
              plugins, worlds or backups directly to their server.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-edge">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{user.username}</span>
                    <span
                      className={`inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium uppercase tracking-wider ${
                        user.enabled
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-edge bg-raised text-muted"
                      }`}
                    >
                      {user.enabled ? "active" : "disabled"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="font-mono text-[11px]">{user.server?.name ?? "deleted server"}</span>
                    {user.server?.ipv4 && <span className="font-mono text-[11px] text-faint">sftp://{user.server.ipv4}:22</span>}
                    <span className="font-mono text-[11px] text-faint">{user.homePath}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await toggleSftpUser(user.id, !user.enabled);
                    }}
                  >
                    <button
                      type="submit"
                      className={`inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-medium transition-colors ${
                        user.enabled
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-edge bg-raised text-muted"
                      }`}
                    >
                      {user.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await deleteSftpUser(user.id);
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

      {/* Ports note */}
      <div className="mt-6 rounded-2xl border border-edge bg-raised/30 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <KeyRound className="h-4 w-4 text-accent" aria-hidden="true" />
          Connection reference
        </div>
        <div className="mt-3 grid gap-3 text-xs text-muted sm:grid-cols-3">
          <div className="rounded-xl border border-edge bg-base/40 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-faint">Host</div>
            <div className="mt-1 font-mono text-[11px]">10.40.0.11</div>
          </div>
          <div className="rounded-xl border border-edge bg-base/40 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-faint">Port</div>
            <div className="mt-1 font-mono text-[11px]">22</div>
          </div>
          <div className="rounded-xl border border-edge bg-base/40 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-faint">Protocol</div>
            <div className="mt-1 font-mono text-[11px]">SFTP (SSH file transfer)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
