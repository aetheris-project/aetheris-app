import { prisma } from "@/lib/db";
import { demoClientServers } from "@/lib/demo-data";
import { Cpu, HardDrive, MemoryStick, Server, TerminalSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  // The Vercel demo deployment has no reachable database: fall back to the
  // static demo dataset so the portal always renders.
  let servers;
  try {
    servers = await prisma.server.findMany({
      where: { state: { not: "terminated" } },
      orderBy: { createdAt: "desc" },
      take: 20
    });
  } catch {
    servers = demoClientServers;
  }

  const running = servers.filter((server) => server.state === "running").length;

  const totals = servers.reduce(
    (acc, server) => {
      const resources = server.resources as { vcpu?: number; memoryMb?: number; diskMb?: number };
      acc.vcpu += resources.vcpu ?? 0;
      acc.memoryMb += resources.memoryMb ?? 0;
      acc.diskMb += resources.diskMb ?? 0;
      return acc;
    },
    { vcpu: 0, memoryMb: 0, diskMb: 0 }
  );

  const stats = [
    { label: "Active servers", value: String(running), icon: Server },
    { label: "vCPU allocated", value: String(totals.vcpu), icon: Cpu },
    { label: "Memory", value: `${Math.round(totals.memoryMb / 1024)} GB`, icon: MemoryStick },
    { label: "Disk", value: `${Math.round(totals.diskMb / 1024)} GB`, icon: HardDrive }
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your servers</h1>
          <p className="mt-1 text-sm text-muted">
            Power control, console access and billing are managed from this portal.
          </p>
        </div>
        <a href="/api/auth/signout" className="aetheris-btn-secondary">
          Sign out
        </a>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="aetheris-card aetheris-card-hover p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-xl font-bold tracking-tight">{stat.value}</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-faint">
                    {stat.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">Server inventory</span>
          <span className="text-xs text-faint">{servers.length} total</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Name</th>
              <th scope="col" className="px-4 py-3 font-medium">State</th>
              <th scope="col" className="px-4 py-3 font-medium">Resources</th>
              <th scope="col" className="px-4 py-3 font-medium">IPv4</th>
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {servers.map((server) => {
              const resources = server.resources as { vcpu?: number; memoryMb?: number; diskMb?: number };
              return (
                <tr key={server.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium">{server.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium ${
                        server.state === "running"
                          ? "border-success/30 bg-success/10 text-success"
                          : server.state === "suspended"
                            ? "border-warning/30 bg-warning/10 text-warning"
                            : "border-edge bg-raised text-muted"
                      }`}
                    >
                      {server.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {resources.vcpu ?? "-"} vCPU / {resources.memoryMb ?? "-"} MB / {resources.diskMb ?? "-"} MB
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{server.ipv4 ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 text-xs text-faint">
                      <TerminalSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      Console
                    </span>
                  </td>
                </tr>
              );
            })}
            {servers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No servers provisioned yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
