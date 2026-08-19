import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [servers, invoices, nodes] = await Promise.all([
    prisma.server.count({ where: { state: "running" } }),
    prisma.invoice.aggregate({
      _sum: { totalCents: true },
      where: { status: { in: ["pending", "overdue"] } }
    }),
    prisma.node.count()
  ]);

  const outstanding = (invoices._sum.totalCents ?? 0) / 100;

  const stats = [
    { label: "Running servers", value: String(servers) },
    { label: "Managed nodes", value: String(nodes) },
    { label: "Outstanding balance", value: `$${outstanding.toFixed(2)}` }
  ];

  return (
    <div>
      <p className="aetheris-kicker">Admin</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Control plane overview</h1>
      <p className="mt-2 text-sm text-muted">
        Aggregate state across hypervisors, billing and tenancy.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="aetheris-card aetheris-card-hover p-6">
            <div className="text-xs font-medium uppercase tracking-wider text-faint">{stat.label}</div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-edge/60 bg-white/[0.02] p-6 text-sm text-muted">
        Extend this page with driver-backed node telemetry, billing run status
        and audit streams. Drivers live in{" "}
        <code className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 font-mono text-xs text-ink">
          src/lib/adapters/hypervisors
        </code>
        .
      </div>
    </div>
  );
}
