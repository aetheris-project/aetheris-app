import type { Metadata } from "next";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Wallet
} from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing"
};

const REVENUE_SERIES = [42810, 44220, 43940, 46180, 45520, 47260, 46810, 48140, 47680, 48920, 48340, 49710];
const REVENUE_LABELS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

const PLAN_BREAKDOWN = [
  { plan: "Starter", count: 640, revenue: 12800 },
  { plan: "Growth", count: 412, revenue: 18540 },
  { plan: "Enterprise", count: 168, revenue: 15120 },
  { plan: "Dedicated", count: 64, revenue: 3200 }
];

const DEMO_INVOICES = [
  { id: "INV-2026-00421", client: "Acme Corp", description: "Monthly hosting - 4x Growth", amount: 24900, dueDate: "2026-09-01", status: "pending" },
  { id: "INV-2026-00420", client: "Northwind Ltd", description: "Monthly hosting - 2x Starter", amount: 8900, dueDate: "2026-08-22", status: "paid" },
  { id: "INV-2026-00419", client: "Globex", description: "Overages - bandwidth (1.2 TB)", amount: 41200, dueDate: "2026-08-05", status: "overdue" },
  { id: "INV-2026-00418", client: "Initech", description: "Monthly hosting - 1x Growth", amount: 12900, dueDate: "2026-08-10", status: "failed" },
  { id: "INV-2026-00417", client: "Umbrella Corp", description: "Dedicated - 8x Redis", amount: 124900, dueDate: "2026-07-28", status: "paid" }
];

function RevenueChart() {
  const max = Math.max(...REVENUE_SERIES);
  return (
    <div className="aetheris-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <TrendingUp className="h-4 w-4 text-accent" aria-hidden="true" />
          Monthly revenue
        </div>
        <span className="text-xs text-faint">last 12 months</span>
      </div>
      <div className="mt-5 flex h-32 items-end gap-1.5">
        {REVENUE_SERIES.map((value, index) => (
          <div key={index} className="group relative flex-1">
            <div
              className="w-full rounded-t-md bg-accent/50 transition-colors duration-200 hover:bg-accent"
              style={{ height: `${(value / max) * 100}%` }}
            />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-edge bg-raised px-2 py-1 text-[10px] font-mono text-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              ${(value / 100).toFixed(0)}k
            </div>
            <div className="mt-1 text-center text-[9px] text-faint">{REVENUE_LABELS[index]}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-edge bg-raised/40 p-3">
        <div className="text-xs text-muted">Current MRR</div>
        <div className="text-sm font-bold">${(REVENUE_SERIES[REVENUE_SERIES.length - 1] / 100).toFixed(2)}</div>
      </div>
    </div>
  );
}

export default async function AdminBillingPage() {
  let totalOutstanding = 84200;
  let totalPaid = 483400;
  try {
    const [outstanding, paid] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { totalCents: true }, where: { status: { in: ["pending", "overdue"] } } }),
      prisma.invoice.aggregate({ _sum: { totalCents: true }, where: { status: "paid" } })
    ]);
    totalOutstanding = outstanding._sum.totalCents ?? totalOutstanding;
    totalPaid = paid._sum.totalCents ?? totalPaid;
  } catch {
    // demo fallback
  }

  const invoices = DEMO_INVOICES;

  return (
    <div>
      <p className="aetheris-kicker">Admin</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Billing engine</h1>
      <p className="mt-2 text-sm text-muted">
        Invoices, subscriptions, dunning and revenue analytics.
      </p>

      {/* Stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Outstanding", value: `$${(totalOutstanding / 100).toFixed(2)}`, icon: Wallet, color: "text-warning" },
          { label: "Paid this month", value: `$${(totalPaid / 100).toFixed(2)}`, icon: CheckCircle2, color: "text-success" },
          { label: "Overdue", value: "$412.00", icon: AlertTriangle, color: "text-danger" },
          { label: "Active plans", value: String(PLAN_BREAKDOWN.reduce((s, p) => s + p.count, 0)), icon: CreditCard, color: "text-accent" }
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

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Revenue chart */}
        <div className="lg:col-span-3">
          <RevenueChart />
        </div>

        {/* Plan breakdown */}
        <div className="aetheris-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <DollarSign className="h-4 w-4 text-accent" aria-hidden="true" />
            Plan breakdown
          </div>
          <div className="mt-4 space-y-3">
            {PLAN_BREAKDOWN.map((plan) => {
              const maxRevenue = Math.max(...PLAN_BREAKDOWN.map((p) => p.revenue));
              return (
                <div key={plan.plan}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted">{plan.plan}</span>
                    <span className="font-mono text-faint">{plan.count} servers</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${(plan.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-faint">${(plan.revenue / 100).toFixed(2)} MRR</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent invoices */}
      <div className="aetheris-card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge bg-raised/40 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <CreditCard className="h-4 w-4 text-accent" aria-hidden="true" />
            Recent invoices
          </span>
          <span className="text-xs text-faint">{invoices.length} latest</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Invoice</th>
                <th scope="col" className="px-4 py-3 font-medium">Client</th>
                <th scope="col" className="px-4 py-3 font-medium">Description</th>
                <th scope="col" className="px-4 py-3 font-medium">Amount</th>
                <th scope="col" className="px-4 py-3 font-medium">Due</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {invoices.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-raised/40">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.id}</td>
                  <td className="px-4 py-3 font-medium">{inv.client}</td>
                  <td className="px-4 py-3 text-xs text-muted">{inv.description}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">${(inv.amount / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{inv.dueDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-medium uppercase tracking-wider ${
                        inv.status === "paid"
                          ? "border-success/30 bg-success/10 text-success"
                          : inv.status === "pending"
                            ? "border-accent/30 bg-accent-soft text-accent"
                            : inv.status === "overdue"
                              ? "border-danger/30 bg-danger/10 text-danger"
                              : "border-edge bg-raised text-muted"
                      }`}
                    >
                      {inv.status}
                    </span>
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
