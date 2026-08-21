"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AetherisLogo } from "@/components/AetherisLogo";
import { LogOut, User, ShieldCheck } from "lucide-react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-edge bg-base/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Aetheris client portal">
            <AetherisLogo size={26} className="drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
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
            <Link
              href="/admin"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-edge bg-raised/60 px-3 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-ink"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Admin
            </Link>
            <a href="/login" className="aetheris-btn-secondary h-8 px-3 text-xs">
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </a>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
