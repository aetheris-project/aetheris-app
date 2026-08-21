import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Cpu,
  Filter,
  HardDrive,
  MemoryStick,
  Monitor,
  Power,
  Search,
  Server,
  TerminalSquare
} from "lucide-react";
import { prisma } from "@/lib/db";
import { demoClientServers } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Servers"
};

interface ServerRow {
  id: string;
  name: string;
  state: string;
  ipv4: string | null;
  node: string;
  vcpu: number;
  memoryMb: number;
  diskMb: number;
}

const DEMO_SERVERS: ServerRow[] = [
  { id: "srv-8f2a", name: "Production-01", state: "running", ipv4: "10.40.0.11", node: "fra-01", vcpu: 4, memoryMb: 8192, diskMb: 81920 },
  { id: "srv-19c3", name: "Web-02", state: "running", ipv4: "10.40.0.12", node: "fra-01", vcpu: 2, memoryMb: 4096, diskMb: 40960 },
  { id: "srv-44b1", name: "Staging-API", state: "stopped", ipv4: "10.40.0.13", node: "iad-02", vcpu: 2, memoryMb: 4096, diskMb: 40960 },
  { id: "srv-a7d0", name: "Cache-Redis", state: "running", ipv4: "10.40.0.14", node: "sin-01", vcpu: 1, memoryMb: 2048, diskMb: 20480 },
  { id: "srv-01x7", name: "Minecraft-Prod", state: "running", ipv4: "10.40.0.15", node: "fra-01", vcpu: 4, memoryMb: 8192, diskMb: 61440 },
  { id: "srv-92km", name: "TF2-Server", state: "running", ipv4: "10.40.0.16", node: "iad-02", vcpu: 2, memoryMb: 4096, diskMb: 30720 }
];

export default async function AdminServersPage() {
  let servers: ServerRow[] = DEMO_SERVERS;
  try {
    const dbServers = await prisma.server.findMany({
      where: { state: { not: "terminated" } },
      include: { node: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    if (dbServers.length > 0) {
      servers = dbServers.map((s) => ({
        id: s.id,
        name: s.name,
        state: s.state,
        ipv4: s.ipv4,
        node: s.node?.name ?? "unknown",
        vcpu: (s.resources as { vcpu?: number })?.vcpu ?? 0,
        memoryMb: (s.resources as { memoryMb?: number })?.memoryMb ?? 0,
        diskMb: (s.resources as { diskMb?: number })?.diskMb ?? 0
      }));
    }
  } catch {
    // demo fallback
  }

  const running = servers.filter((s) => s.state === "running").length;
  const totalVcpu = servers.reduce((s, srv) => s + srv.vcpu, 0);
  const totalMem = servers.reduce((s, srv) => s + srv.memoryMb, 0);
  const totalDisk = servers.reduce((s, srv) => s + srv.diskMb, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="aetheris-kicker">Admin</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Server management</h1>
          <p className="mt-2 text-sm text-muted">
            All provisioned servers across every node and region.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total servers", value: String(servers.length), icon: Server, color: "text-accent" },
          { label: "Running", value: String(running), icon: Monitor, color: "text-success" },
          { label: "vCPU allocated", value: String(totalVcpu), icon: Cpu, color: "text-accent" },
          { label: "Memory allocated", value: `${Math.round(totalMem / 1024)} GB`, icon: MemoryStick, color: "text-accent" }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="aetheris-card aetheris-card-hover p-5">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl border border-edge bg-raised/60 ${stat.color}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-xl font-bold tracking-tight">{stat.value}</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-faint">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Server list */}
      <div className="aetheris-card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge bg-raised/40 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Monitor className="h-4 w-4 text-accent" aria-hidden="true" />
            Server inventory
          </span>
          <span className="text-xs text-faint">{servers.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">State</th>
                <th scope="col" className="px-4 py-3 font-medium">Node</th>
                <th scope="col" className="px-4 py-3 font-medium">Resources</th>
                <th scope="col" className="px-4 py-3 font-medium">IPv4</th>
                <th scope="col" className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {servers.map((server) => (
                <tr key={server.id} className="transition-colors hover:bg-raised/40">
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
                  <td className="px-4 py-3 font-mono text-xs text-muted">{server.node}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {server.vcpu} vCPU / {Math.round(server.memoryMb / 1024)} GB / {Math.round(server.diskMb / 1024)} GB
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{server.ipv4 ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button className="inline-flex h-7 items-center gap-1 rounded-lg border border-edge bg-raised/60 px-2.5 text-xs text-muted transition-colors hover:border-success/40 hover:text-success">
                        <Power className="h-3 w-3" aria-hidden="true" />
                        Start
                      </button>
                      <button className="inline-flex h-7 items-center gap-1 rounded-lg border border-edge bg-raised/60 px-2.5 text-xs text-muted transition-colors hover:border-warning/40 hover:text-warning">
                        <Power className="h-3 w-3" aria-hidden="true" />
                        Stop
                      </button>
                      <Link
                        href={`/console/${server.id}`}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-edge bg-raised/60 px-2.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-ink"
                      >
                        <TerminalSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
