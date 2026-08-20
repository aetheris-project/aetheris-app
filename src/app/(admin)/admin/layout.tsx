import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarClock,
  CreditCard,
  FolderLock,
  LayoutDashboard,
  Monitor,
  Palette,
  Server,
  Settings
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/status", label: "Status", icon: Activity },
  { href: "/admin/nodes", label: "Nodes", icon: Server },
  { href: "/admin/servers", label: "Servers", icon: Monitor },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/cron", label: "Scheduled tasks", icon: CalendarClock },
  { href: "/admin/sftp", label: "SFTP users", icon: FolderLock },
  { href: "/admin/whitelabel", label: "Whitelabel", icon: Palette },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-edge bg-surface">
        <div className="flex h-14 items-center gap-2.5 border-b border-edge px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-extrabold text-base">
            A
          </span>
          <span className="text-sm font-semibold">Aetheris Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Admin">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-raised hover:text-ink"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-edge p-4 text-xs text-muted">
          Platform configuration is stored in PostgreSQL and cached in Redis.
          No rebuild required.
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
