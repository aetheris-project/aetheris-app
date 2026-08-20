import type { ReactNode } from "react";
import Link from "next/link";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-edge bg-base/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Aetheris client portal">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-extrabold text-base shadow-[0_0_20px_-4px_color-mix(in_srgb,rgb(var(--aetheris-accent))_70%,transparent)]">
              A
            </span>
            <span className="text-sm font-semibold tracking-tight">Aetheris</span>
            <span className="hidden rounded-full border border-edge bg-raised/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-faint sm:inline">
              Client portal
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[11px] text-muted sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
              Operational
            </span>
            <a href="/api/auth/signout" className="aetheris-btn-secondary h-8 px-3 text-xs">
              Sign out
            </a>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
