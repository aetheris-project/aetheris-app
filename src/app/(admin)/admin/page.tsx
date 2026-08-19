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
      <h1 className="text-xl font-semibold tracking-tight">Control plane overview</h1>
      <p className="mt-1 text-sm text-muted">
        Aggregate state across hypervisors, billing and tenancy.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="aetheris-card p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted">{stat.label}</div>
            <div className="mt-2 text-2xl font-bold tracking-tight">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-edge p-6 text-sm text-muted">
        Extend this page with driver-backed node telemetry, billing run status
        and audit streams. Drivers live in <code className="text-ink">src/lib/adapters/hypervisors</code>.
      </div>
    </div>
  );
}
