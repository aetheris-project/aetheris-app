import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  const servers = await prisma.server.findMany({
    where: { state: { not: "terminated" } },
    orderBy: { createdAt: "desc" },
    take: 20
  });

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

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08]">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Name</th>
              <th scope="col" className="px-4 py-3 font-medium">State</th>
              <th scope="col" className="px-4 py-3 font-medium">Resources</th>
              <th scope="col" className="px-4 py-3 font-medium">IPv4</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {servers.map((server) => {
              const resources = server.resources as { vcpu?: number; memoryMb?: number; diskMb?: number };
              return (
                <tr key={server.id}>
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
                </tr>
              );
            })}
            {servers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
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
