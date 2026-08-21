"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AdminNav } from "./admin-nav";
import { AetherisLogo } from "@/components/AetherisLogo";
import { LogOut, User } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-edge bg-surface/80 backdrop-blur-xl">
        <Link href="/" className="flex h-14 items-center gap-2.5 border-b border-edge px-4 transition-colors hover:bg-raised/40">
          <AetherisLogo size={28} className="drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">Aetheris Admin</div>
            <div className="text-[10px] uppercase tracking-wider text-faint">Control panel</div>
          </div>
        </Link>
        <AdminNav />
        <div className="border-t border-edge p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
            All systems operational
          </div>
          <p className="mt-2 text-[11px] leading-5 text-faint">
            Platform configuration stored in PostgreSQL and Redis.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-edge bg-raised/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent">
                <User className="h-3 w-3" aria-hidden="true" />
              </span>
              <span className="text-[11px] font-medium text-ink">Admin</span>
            </div>
            <a href="/login" className="text-faint transition-colors hover:text-danger" title="Sign out">
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </aside>
      <main className="relative min-w-0 flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
