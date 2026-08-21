import type { ReactNode } from "react";
import { AdminNav } from "./admin-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-edge bg-surface/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2.5 border-b border-edge px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-extrabold text-base shadow-[0_0_20px_-4px_color-mix(in_srgb,rgb(var(--aetheris-accent))_70%,transparent)]">
            A
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">Aetheris Admin</div>
            <div className="text-[10px] uppercase tracking-wider text-faint">Control panel</div>
          </div>
        </div>
        <AdminNav />
        <div className="border-t border-edge p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
            All systems operational
          </div>
          <p className="mt-2 text-[11px] leading-5 text-faint">
            Platform configuration is stored in PostgreSQL and cached in Redis.
            No rebuild required.
          </p>
        </div>
      </aside>
      <main className="relative min-w-0 flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
