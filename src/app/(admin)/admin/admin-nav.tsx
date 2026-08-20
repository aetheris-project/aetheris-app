"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-3" aria-label="Admin">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`aetheris-nav-link ${active ? "aetheris-nav-link-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
