import type { Metadata } from "next";
import {
  Activity,
  ArrowUpRight,
  Cpu,
  HardDrive,
  MapPin,
  MemoryStick,
  Power,
  Server,
  Wifi
} from "lucide-react";
import { prisma } from "@/lib/db";
import { demoNodes } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nodes"
};

interface NodeRecord {
  id: string;
  name: string;
  location: string;
  status: string;
  cpu: number;
  ram: number;
  disk: number;
  cores: number;
  memoryGb: number;
  containers: number;
}

const DEMO_NODES: NodeRecord[] = [
  { id: "fra-01", name: "fra-01", location: "EU West - Frankfurt", status: "online", cpu: 62, ram: 74, disk: 58, cores: 8, memoryGb: 64, containers: 23 },
  { id: "iad-02", name: "iad-02", location: "US East - Ashburn", status: "online", cpu: 41, ram: 52, disk: 47, cores: 16, memoryGb: 128, containers: 41 },
  { id: "sin-01", name: "sin-01", location: "AP South - Singapore", status: "online", cpu: 23, ram: 38, disk: 29, cores: 8, memoryGb: 64, containers: 17 },
  { id: "syd-01", name: "syd-01", location: "AP East - Sydney", status: "draining", cpu: 12, ram: 15, disk: 21, cores: 4, memoryGb: 32, containers: 6 }
];

function StatusBar({ label, value }: { label: string; value: number }) {
  const color = value >= 85 ? "bg-danger" : value >= 70 ? "bg-warning" : "bg-accent";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-faint">{value}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised">
        <div
          className={`h-full rounded-full ${color} shadow-[0_0_10px_color-mix(in_srgb,currentcolor_45%,transparent)] transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default async function AdminNodesPage() {
  let nodes: NodeRecord[] = DEMO_NODES;
  try {
    const dbNodes = await prisma.node.findMany({ orderBy: { name: "asc" } });
    if (dbNodes.length > 0) {
      nodes = dbNodes.map((n) => ({
        id: n.id,
        name: n.name,
        location: n.location,
        status: n.status,
        cpu: 0,
        ram: 0,
        disk: 0,
        cores: 0,
        memoryGb: 0,
        containers: 0
      }));
    }
  } catch {
    // demo fallback
  }

  return (
    <div>
      <p className="aetheris-kicker">Admin</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Node management</h1>
      <p className="mt-2 text-sm text-muted">
        Monitor and manage hypervisor nodes across all regions.
      </p>

      {/* Summary stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total nodes", value: String(nodes.length), icon: Server, trend: `${nodes.filter((n) => n.status === "online").length} online` },
          { label: "Total containers", value: String(nodes.reduce((s, n) => s + n.containers, 0)), icon: Wifi, trend: "across all nodes" },
          { label: "Avg. CPU load", value: `${Math.round(nodes.reduce((s, n) => s + n.cpu, 0) / nodes.length)}%`, icon: Cpu, trend: "cluster-wide" }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="aetheris-card aetheris-card-hover p-5">
              <div className="flex items-start justify-between">
                <span className="aetheris-icon h-9 w-9">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-success">
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  {stat.trend}
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight">{stat.value}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-faint">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Node cards */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {nodes.map((node) => (
          <div key={node.id} className="aetheris-card aetheris-card-hover p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
                  <Server className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-mono text-sm font-semibold">{node.name}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {node.location}
                  </div>
                </div>
              </div>
              <span
                className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-medium uppercase tracking-wider ${
                  node.status === "online"
                    ? "border-success/30 bg-success/10 text-success"
                    : node.status === "draining"
                      ? "border-warning/30 bg-warning/10 text-warning"
                      : "border-edge bg-raised text-muted"
                }`}
              >
                <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${node.status === "online" ? "bg-success animate-pulse-dot" : node.status === "draining" ? "bg-warning" : "bg-faint"}`} />
                {node.status}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Cores", value: String(node.cores), icon: Cpu },
                { label: "Memory", value: `${node.memoryGb} GB`, icon: MemoryStick },
                { label: "Servers", value: String(node.containers), icon: Power }
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-edge bg-raised/40 p-3">
                  <item.icon className="mx-auto h-3.5 w-3.5 text-faint" aria-hidden="true" />
                  <div className="mt-1 font-mono text-sm font-semibold">{item.value}</div>
                  <div className="text-[9px] uppercase tracking-wider text-faint">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <StatusBar label="CPU" value={node.cpu} />
              <StatusBar label="Memory" value={node.ram} />
              <StatusBar label="Disk" value={node.disk} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
