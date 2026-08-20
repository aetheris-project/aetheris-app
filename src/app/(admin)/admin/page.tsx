import { prisma } from "@/lib/db";
import { demoStats } from "@/lib/demo-data";
import {
  Activity,
  ArrowUpRight,
  CreditCard,
  Server,
  ShieldCheck,
  TrendingUp,
  Wallet
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  // Fall back to the static demo dataset when the database is unreachable.
  let runningServers = demoStats.runningServers;
  let nodes = demoStats.nodes;
  let outstanding = demoStats.outstanding;
  let recentServers = demoStats.recentServers;
  try {
    const [counted, nodeCount, outstandingAgg, recent] = await Promise.all([
      prisma.server.count({ where: { state: "running" } }),
      prisma.node.count(),
      prisma.invoice.aggregate({
        _sum: { totalCents: true },
        where: { status: { in: ["pending", "overdue"] } }
      }),
      prisma.server.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, state: true, createdAt: true }
      })
    ]);
    runningServers = counted;
    nodes = nodeCount;
    outstanding = (outstandingAgg._sum.totalCents ?? 0) / 100;
    recentServers = recent;
  } catch {
    // demo fallback already set
  }

  const stats = [
    {
      label: "Running servers",
      value: String(runningServers),
      sub: "across all nodes",
      icon: Server,
      trend: "+12 this week"
    },
    {
      label: "Managed nodes",
      value: String(nodes),
      sub: "hypervisor endpoints",
      icon: ShieldCheck,
      trend: "3 regions online"
    },
    {
      label: "Outstanding balance",
      value: `$${outstanding.toFixed(2)}`,
      sub: "pending + overdue invoices",
      icon: Wallet,
      trend: "due this cycle"
    }
  ];

  const utilization = [
    { label: "CPU", value: 62 },
    { label: "Memory", value: 74 },
    { label: "Disk", value: 48 }
  ];

  return (
    <div>
      <p className="aetheris-kicker">Admin</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Control panel overview</h1>
      <p className="mt-2 text-sm text-muted">
        Aggregate state across hypervisors, billing and tenancy.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="aetheris-card aetheris-card-hover p-6">
              <div className="flex items-start justify-between">
                <span className="aetheris-icon">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-success">
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  {stat.trend}
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold tracking-tight">{stat.value}</div>
              <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-faint">
                {stat.label}
              </div>
              <div className="mt-1 text-xs text-muted">{stat.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Utilization */}
        <div className="aetheris-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
              Platform utilization
            </div>
            <span className="text-xs text-faint">last 24h</span>
          </div>
          <div className="mt-5 space-y-4">
            {utilization.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted">{item.label}</span>
                  <span className="font-mono text-faint">{item.value}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised">
                  <div
                    className="h-full rounded-full bg-accent shadow-[0_0_12px_color-mix(in_srgb,rgb(var(--aetheris-accent))_55%,transparent)] transition-all duration-500"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-edge bg-raised/40 p-3 text-xs text-muted">
            <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />
            Nodes are healthy; no draining required.
          </div>
        </div>

        {/* Recent activity */}
        <div className="aetheris-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <CreditCard className="h-4 w-4 text-accent" aria-hidden="true" />
              Recently provisioned
            </div>
            <span className="text-xs text-faint">latest first</span>
          </div>
          <div className="mt-5 space-y-2">
            {recentServers.map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between rounded-lg border border-edge px-3 py-2.5"
              >
                <span className="font-mono text-xs">{server.name}</span>
                <span
                  className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-medium uppercase tracking-wider ${
                    server.state === "running"
                      ? "border-success/30 bg-success/10 text-success"
                      : server.state === "suspended"
                        ? "border-warning/30 bg-warning/10 text-warning"
                        : "border-edge bg-raised text-muted"
                  }`}
                >
                  {server.state}
                </span>
              </div>
            ))}
            {recentServers.length === 0 && (
              <div className="rounded-lg border border-dashed border-edge/60 p-6 text-center text-xs text-muted">
                No servers provisioned yet. Provision the first one from the
                Servers page.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
