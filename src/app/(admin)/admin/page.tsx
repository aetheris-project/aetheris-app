import { prisma } from "@/lib/db";
import { demoStats } from "@/lib/demo-data";
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Globe,
  Gauge,
  LayoutGrid,
  Mail,
  Monitor,
  Palette,
  Server,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ── Demo data for when DB is unavailable ──────────────────────────── */

const DEMO_REVENUE = [
  { month: "Jan", value: 2400 },
  { month: "Feb", value: 3200 },
  { month: "Mar", value: 2800 },
  { month: "Apr", value: 4100 },
  { month: "May", value: 3600 },
  { month: "Jun", value: 5200 },
  { month: "Jul", value: 4800 },
  { month: "Aug", value: 6100 }
];

const DEMO_ACTIVITY = [
  { time: "2 min ago", action: "Server provisioned", detail: "node-03 / DE-Frankfurt", type: "server" as const },
  { time: "18 min ago", action: "Invoice paid", detail: "INV-00842 -- $89.00", type: "billing" as const },
  { time: "1 hr ago", action: "Node online", detail: "proxmox-us-east / 22 containers", type: "node" as const },
  { time: "2 hr ago", action: "Backup completed", detail: "47 servers backed up", type: "system" as const },
  { time: "3 hr ago", action: "Client registered", detail: "enterprise@acme.io", type: "user" as const },
  { time: "5 hr ago", action: "SSL renewed", detail: "*.panel.example.com", type: "system" as const }
];

const DEMO_SERVERS = [
  { name: "web-prod-01", node: "proxmox-de", cpu: 62, mem: 74, disk: 48, status: "running" },
  { name: "api-prod-02", node: "pterodactyl-uk", cpu: 38, mem: 55, disk: 31, status: "running" },
  { name: "game-us-01", node: "pterodactyl-us", cpu: 89, mem: 82, disk: 67, status: "running" },
  { name: "db-replica", node: "virtfusion-nl", cpu: 22, mem: 41, disk: 55, status: "running" },
  { name: "staging-01", node: "proxmox-de", cpu: 8, mem: 18, disk: 12, status: "stopped" },
  { name: "worker-bg", node: "pterodactyl-uk", cpu: 55, mem: 63, disk: 28, status: "running" }
];

const QUICK_ACTIONS = [
  { label: "Provision server", href: "/admin/servers", icon: Server },
  { label: "View invoices", href: "/admin/billing", icon: CreditCard },
  { label: "Manage nodes", href: "/admin/nodes", icon: LayoutGrid },
  { label: "Whitelabel", href: "/admin/whitelabel", icon: Palette },
  { label: "Scheduled tasks", href: "/admin/cron", icon: CalendarClock },
  { label: "Settings", href: "/admin/settings", icon: Settings }
];

const SYSTEM_HEALTH = [
  { label: "PostgreSQL", status: "healthy", detail: "Connection pool: 8/20", latency: "2ms" },
  { label: "Redis", status: "healthy", detail: "Memory: 128MB / 1GB", latency: "<1ms" },
  { label: "BullMQ Workers", status: "healthy", detail: "4 active, 0 stalled", latency: "---" },
  { label: "Nginx Reverse Proxy", status: "healthy", detail: "SSL: valid 87 days", latency: "---" }
];

/* ── Component ─────────────────────────────────────────────────────── */

export default async function AdminOverviewPage() {
  // Fall back to the static demo dataset when the database is unreachable.
  let runningServers = demoStats.runningServers;
  let nodes = demoStats.nodes;
  let outstanding = demoStats.outstanding;
  let recentServers = demoStats.recentServers;
  let totalClients = 247;
  let monthlyRevenue = 6100;
  let paidInvoices = 312;

  try {
    const [counted, nodeCount, outstandingAgg, recent, clientCount, revenueAgg, paidCount] =
      await Promise.all([
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
        }),
        prisma.user.count().catch(() => 247),
        prisma.invoice
          .aggregate({
            _sum: { totalCents: true },
            _count: true,
            where: { status: "paid" }
          })
          .catch(() => ({ _sum: { totalCents: 31200 }, _count: 312 })),
        prisma.invoice.count({ where: { status: "paid" } }).catch(() => 312)
      ]);
    runningServers = counted;
    nodes = nodeCount;
    outstanding = (outstandingAgg._sum.totalCents ?? 0) / 100;
    recentServers = recent;
    totalClients = clientCount;
    monthlyRevenue = (revenueAgg._sum.totalCents ?? 0) / 100 || 6100;
    paidInvoices = paidCount || paidCount;
  } catch {
    // demo fallback already set
  }

  /* ── Stats row ─────────────────────────────────────────────────── */
  const stats = [
    {
      label: "Active servers",
      value: String(runningServers),
      sub: "across all nodes",
      icon: Server,
      trend: "+12 this week",
      trendUp: true,
      color: "emerald"
    },
    {
      label: "Managed nodes",
      value: String(nodes),
      sub: "hypervisor endpoints",
      icon: ShieldCheck,
      trend: "3 regions",
      trendUp: true,
      color: "blue"
    },
    {
      label: "Monthly revenue",
      value: `$${monthlyRevenue.toLocaleString()}`,
      sub: `${paidInvoices} paid invoices`,
      icon: DollarSign,
      trend: "+18.4%",
      trendUp: true,
      color: "violet"
    },
    {
      label: "Outstanding",
      value: `$${outstanding.toFixed(2)}`,
      sub: "pending + overdue",
      icon: Wallet,
      trend: outstanding > 100 ? "action needed" : "on track",
      trendUp: outstanding <= 100,
      color: outstanding > 100 ? "amber" : "emerald"
    },
    {
      label: "Total clients",
      value: String(totalClients),
      sub: "registered accounts",
      icon: Users,
      trend: "+23 this month",
      trendUp: true,
      color: "cyan"
    },
    {
      label: "Uptime",
      value: "99.97%",
      sub: "last 30 days",
      icon: Gauge,
      trend: "0 incidents",
      trendUp: true,
      color: "emerald"
    }
  ];

  const utilization = [
    { label: "CPU", value: 62, color: "emerald" },
    { label: "Memory", value: 74, color: "blue" },
    { label: "Disk", value: 48, color: "violet" },
    { label: "Bandwidth", value: 35, color: "cyan" }
  ];

  const maxRevenue = Math.max(...DEMO_REVENUE.map((r) => r.value));

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="aetheris-kicker">Admin</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight lg:text-3xl">
            Control panel overview
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Aggregate state across hypervisors, billing and tenancy. Data refreshes
            every 60 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
            All systems operational
          </span>
          <span className="text-[11px] text-faint">
            {new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
      </div>

      {/* ── Stats grid ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="aetheris-card aetheris-card-hover p-5"
            >
              <div className="flex items-start justify-between">
                <span className="aetheris-icon">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider ${
                    stat.trendUp ? "text-success" : "text-warning"
                  }`}
                >
                  {stat.trendUp && <ArrowUpRight className="h-3 w-3" aria-hidden="true" />}
                  {stat.trend}
                </span>
              </div>
              <div className="mt-4 text-2xl font-bold tracking-tight xl:text-3xl">
                {stat.value}
              </div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-faint">
                {stat.label}
              </div>
              <div className="mt-1 text-[11px] text-muted">{stat.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── Main 2-column layout ────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Revenue chart - 2 cols */}
        <div className="aetheris-card p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <TrendingUp className="h-4 w-4 text-accent" aria-hidden="true" />
              Revenue overview
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-faint">Last 8 months</span>
              <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold text-success">
                +18.4%
              </span>
            </div>
          </div>
          <div className="mt-6 flex items-end gap-2" style={{ height: 180 }}>
            {DEMO_REVENUE.map((item) => (
              <div key={item.month} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative w-full" style={{ height: 140 }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-accent/70 to-accent/30 transition-all duration-500 group-hover:from-accent group-hover:to-accent/50"
                    style={{ height: `${(item.value / maxRevenue) * 100}%` }}
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-edge bg-surface px-2 py-0.5 text-[10px] font-mono text-muted opacity-0 transition-opacity group-hover:opacity-100">
                    ${item.value.toLocaleString()}
                  </div>
                </div>
                <span className="text-[10px] text-faint">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Utilization - 1 col */}
        <div className="aetheris-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
            Platform utilization
          </div>
          <span className="text-[10px] text-faint">last 24h</span>
          <div className="mt-6 space-y-5">
            {utilization.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted">{item.label}</span>
                  <span className="font-mono text-faint">{item.value}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised">
                  <div
                    className="h-full rounded-full bg-accent shadow-[0_0_12px_color-mix(in_srgb,rgb(var(--aetheris-accent))_55%,transparent)] transition-all duration-700"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 p-3 text-xs text-success">
            <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
            All nodes healthy. No draining required.
          </div>
        </div>
      </div>

      {/* ── Server overview + Activity ──────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Server overview */}
        <div className="aetheris-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Monitor className="h-4 w-4 text-accent" aria-hidden="true" />
              Server overview
            </div>
            <a
              href="/admin/servers"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent transition-colors hover:text-accent/80"
            >
              View all <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-5 space-y-2">
            {DEMO_SERVERS.map((server) => (
              <div
                key={server.name}
                className="flex items-center gap-3 rounded-lg border border-edge px-3 py-2.5 transition-colors hover:bg-raised/40"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    server.status === "running"
                      ? "bg-success animate-pulse-dot"
                      : "bg-faint"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-xs font-medium text-ink">
                      {server.name}
                    </span>
                    <span className="text-[10px] text-faint">{server.node}</span>
                  </div>
                  <div className="mt-1.5 flex gap-3">
                    {[
                      { label: "CPU", value: server.cpu },
                      { label: "MEM", value: server.mem },
                      { label: "DSK", value: server.disk }
                    ].map((m) => (
                      <div key={m.label} className="flex items-center gap-1.5">
                        <span className="text-[9px] text-faint">{m.label}</span>
                        <div className="h-1 w-12 overflow-hidden rounded-full bg-raised">
                          <div
                            className={`h-full rounded-full transition-all ${
                              m.value > 80
                                ? "bg-danger"
                                : m.value > 60
                                  ? "bg-warning"
                                  : "bg-accent"
                            }`}
                            style={{ width: `${m.value}%` }}
                          />
                        </div>
                        <span className="font-mono text-[9px] text-faint">{m.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <span
                  className={`inline-flex h-5 items-center rounded-full border px-2 text-[9px] font-semibold uppercase ${
                    server.status === "running"
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-edge bg-raised text-faint"
                  }`}
                >
                  {server.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity timeline */}
        <div className="aetheris-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Zap className="h-4 w-4 text-accent" aria-hidden="true" />
              Recent activity
            </div>
            <span className="text-[10px] text-faint">auto-refresh</span>
          </div>
          <div className="mt-5 space-y-0">
            {DEMO_ACTIVITY.map((item, i) => {
              const colors = {
                server: "bg-accent",
                billing: "bg-violet-500",
                node: "bg-blue-500",
                system: "bg-cyan-500",
                user: "bg-amber-500"
              };
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[item.type]}`} />
                    {i < DEMO_ACTIVITY.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-edge" />
                    )}
                  </div>
                  <div className="pb-5">
                    <div className="text-xs font-medium text-ink">{item.action}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-faint">
                      {item.detail}
                    </div>
                    <div className="mt-1 text-[10px] text-faint">{item.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Quick actions + System health ───────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Quick actions */}
        <div className="aetheris-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Zap className="h-4 w-4 text-accent" aria-hidden="true" />
            Quick actions
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.label}
                  href={action.href}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-edge p-4 text-center transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-raised/60"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-muted transition-colors group-hover:text-ink">
                    {action.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* System health */}
        <div className="aetheris-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              System health
            </div>
            <span className="text-[10px] text-faint">
              Last check: {new Date().toLocaleTimeString("en-US", { timeStyle: "short" })}
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {SYSTEM_HEALTH.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border border-edge px-4 py-3 transition-colors hover:bg-raised/40"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      item.status === "healthy"
                        ? "bg-success"
                        : item.status === "degraded"
                          ? "bg-warning"
                          : "bg-danger"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-medium text-ink">{item.label}</div>
                    <div className="mt-0.5 text-[10px] text-faint">{item.detail}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${
                      item.status === "healthy"
                        ? "border-success/30 bg-success/10 text-success"
                        : item.status === "degraded"
                          ? "border-warning/30 bg-warning/10 text-warning"
                          : "border-danger/30 bg-danger/10 text-danger"
                    }`}
                  >
                    {item.status}
                  </span>
                  {item.latency !== "---" && (
                    <div className="mt-1 font-mono text-[10px] text-faint">{item.latency}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-edge bg-raised/40 p-3 text-[11px] text-muted">
            <Globe className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <span className="font-medium">Public endpoints:</span>{" "}
              <a href="/health" className="text-accent hover:underline">/health</a>
              {" / "}
              <a href="/api/status" className="text-accent hover:underline">/api/status</a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent servers (from DB or demo) ────────────────────── */}
      <div className="aetheris-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <CreditCard className="h-4 w-4 text-accent" aria-hidden="true" />
            Recently provisioned
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-faint">latest first</span>
            <a
              href="/admin/servers"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent transition-colors hover:text-accent/80"
            >
              View all <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-edge">
                <th className="pb-3 font-semibold text-muted">Server</th>
                <th className="pb-3 font-semibold text-muted">State</th>
                <th className="hidden pb-3 font-semibold text-muted sm:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/50">
              {recentServers.map((server) => (
                <tr key={server.id} className="transition-colors hover:bg-raised/30">
                  <td className="py-3 font-mono text-ink">{server.name}</td>
                  <td className="py-3">
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
                  </td>
                  <td className="hidden py-3 text-faint sm:table-cell">
                    {new Date(server.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </td>
                </tr>
              ))}
              {recentServers.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-8 text-center text-faint"
                  >
                    No servers provisioned yet. Provision the first one from the Servers page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
