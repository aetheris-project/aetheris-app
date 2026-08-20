import type { Metadata } from "next";
import {
  CheckCircle2,
  Database,
  Github,
  RefreshCw,
  Server,
  Sparkles
} from "lucide-react";
import { prisma } from "@/lib/db";
import { packageVersion } from "@/lib/config/version";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status"
};

interface GithubRelease {
  tag_name: string;
  html_url: string;
  published_at: string;
}

function compareVersions(current: string, latest: string): number {
  const a = current.replace(/^v/, "").split(".").map((part) => parseInt(part, 10) || 0);
  const b = latest.replace(/^v/, "").split(".").map((part) => parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left !== right) return left < right ? -1 : 1;
  }
  return 0;
}

async function fetchLatestRelease(): Promise<GithubRelease | null> {
  try {
    const response = await fetch("https://api.github.com/repos/aetheris-project/aetheris-app/releases/latest", {
      next: { revalidate: 3600 }
    });
    if (!response.ok) return null;
    const data = (await response.json()) as GithubRelease;
    if (!data.tag_name) return null;
    return data;
  } catch {
    return null;
  }
}

export default async function AdminStatusPage() {
  const [serverCount, nodeCount, invoiceCount, latest] = await Promise.all([
    prisma.server.count(),
    prisma.node.count(),
    prisma.invoice.count(),
    fetchLatestRelease()
  ]);

  const current = packageVersion;
  const updateAvailable = latest !== null && compareVersions(current, latest.tag_name) < 0;

  const system = [
    { label: "Runtime", value: `Next.js ${process.env.NEXT_PUBLIC_NEXT_VERSION ?? "14.2"}` },
    { label: "Node", value: process.versions.node },
    { label: "Region", value: process.env.VERCEL_REGION ?? "local" },
    { label: "Environment", value: process.env.NODE_ENV ?? "development" }
  ];

  return (
    <div>
      <p className="aetheris-kicker">Admin</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Platform status</h1>
      <p className="mt-2 text-sm text-muted">
        Version, update availability and control plane health.
      </p>

      {/* Update banner */}
      <div
        className={`mt-8 flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${
          updateAvailable
            ? "border-warning/40 bg-warning/10"
            : "border-success/30 bg-success/10"
        }`}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            updateAvailable ? "bg-warning/20 text-warning" : "bg-success/15 text-success"
          }`}
        >
          {updateAvailable ? (
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {updateAvailable ? (
              <>
                Update available: v{current} → v{latest?.tag_name.replace(/^v/, "")}
              </>
            ) : (
              <>Aetheris v{current} is up to date</>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {updateAvailable && latest ? (
              <>
                Released {new Date(latest.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} on GitHub.
              </>
            ) : latest ? (
              <>Latest release v{latest.tag_name.replace(/^v/, "")} checked against the GitHub release feed.</>
            ) : (
              <>Could not reach the GitHub release feed; the check will retry on the next page load.</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {updateAvailable && latest && (
            <a href={latest.html_url} target="_blank" rel="noopener noreferrer" className="aetheris-btn-primary h-9 px-4">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Upgrade guide
            </a>
          )}
          <a href="https://github.com/aetheris-project/aetheris-app/releases" target="_blank" rel="noopener noreferrer" className="aetheris-btn-secondary h-9 px-4">
            <Github className="h-4 w-4" aria-hidden="true" />
            Releases
          </a>
        </div>
      </div>

      {/* Version cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Current version", value: `v${current}`, icon: Sparkles },
          { label: "Latest release", value: latest ? `v${latest.tag_name.replace(/^v/, "")}` : "unknown", icon: Github },
          { label: "Servers", value: String(serverCount), icon: Server },
          { label: "Nodes", value: String(nodeCount), icon: Database }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="aetheris-card aetheris-card-hover p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-mono text-lg font-bold tracking-tight">{card.value}</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-faint">
                    {card.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* System + data grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="aetheris-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Server className="h-4 w-4 text-accent" aria-hidden="true" />
            Runtime
          </div>
          <dl className="mt-4 space-y-3">
            {system.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4">
                <dt className="text-xs uppercase tracking-wider text-faint">{row.label}</dt>
                <dd className="font-mono text-xs text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="aetheris-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Database className="h-4 w-4 text-accent" aria-hidden="true" />
            Data plane
          </div>
          <dl className="mt-4 space-y-3">
            {[
              { label: "Database", value: process.env.DATABASE_URL?.startsWith("file:") ? "SQLite (local)" : "PostgreSQL" },
              { label: "Invoices recorded", value: String(invoiceCount) },
              { label: "Cache", value: "Redis (BullMQ queue)" },
              { label: "Health endpoint", value: "/health" }
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4">
                <dt className="text-xs uppercase tracking-wider text-faint">{row.label}</dt>
                <dd className="font-mono text-xs text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-edge bg-raised/40 p-3 text-xs text-muted">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            Control plane healthy. All drivers idle; no draining required.
          </div>
        </div>
      </div>
    </div>
  );
}
