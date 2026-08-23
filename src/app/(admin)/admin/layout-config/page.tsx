"use client";

import { useState } from "react";
import {
  LayoutGrid,
  Eye,
  EyeOff,
  GripVertical,
  Save,
  RotateCcw,
  Server,
  CreditCard,
  Users,
  Settings,
  Shield,
  Activity,
  Globe,
  Bell,
  BarChart3,
  Palette,
  Calendar,
  HardDrive,
  Zap
} from "lucide-react";

interface PanelConfig {
  id: string;
  name: string;
  icon: typeof Server;
  category: string;
  enabled: boolean;
  order: number;
  description: string;
}

const DEFAULT_PANELS: PanelConfig[] = [
  { id: "overview", name: "Overview", icon: BarChart3, category: "Core", enabled: true, order: 0, description: "Main dashboard with stats and recent activity" },
  { id: "servers", name: "Servers", icon: Server, category: "Core", enabled: true, order: 1, description: "Manage all provisioned servers across nodes" },
  { id: "nodes", name: "Nodes", icon: HardDrive, category: "Core", enabled: true, order: 2, description: "Hypervisor node management and allocation" },
  { id: "billing", name: "Billing", icon: CreditCard, category: "Core", enabled: true, order: 3, description: "Invoices, subscriptions and payment gateways" },
  { id: "users", name: "Users", icon: Users, category: "Core", enabled: true, order: 4, description: "User management and role assignments" },
  { id: "addons", name: "Addons", icon: Zap, category: "Core", enabled: true, order: 5, description: "Addon configurator and integration store" },
  { id: "whitelabel", name: "Whitelabel", icon: Palette, category: "Customization", enabled: true, order: 6, description: "Brand configuration and theme settings" },
  { id: "layout-config", name: "Layout Config", icon: LayoutGrid, category: "Customization", enabled: true, order: 7, description: "Configure which panels are visible and their order" },
  { id: "status", name: "Status", icon: Activity, category: "Operations", enabled: true, order: 8, description: "Service health and monitoring" },
  { id: "cron", name: "Cron Jobs", icon: Calendar, category: "Operations", enabled: true, order: 9, description: "Scheduled tasks and background jobs" },
  { id: "sftp", name: "SFTP Users", icon: HardDrive, category: "Operations", enabled: true, order: 10, description: "SFTP account management" },
  { id: "settings", name: "Settings", icon: Settings, category: "System", enabled: true, order: 11, description: "Platform configuration and API keys" },
  { id: "security", name: "Security", icon: Shield, category: "System", enabled: true, order: 12, description: "Security policies and audit logs" },
  { id: "notifications", name: "Notifications", icon: Bell, category: "System", enabled: true, order: 13, description: "Notification preferences and channels" },
  { id: "dns", name: "DNS Management", icon: Globe, category: "Integrations", enabled: false, order: 14, description: "Cloudflare and DNS zone management" },
  { id: "registrar", name: "Domain Registrar", icon: Globe, category: "Integrations", enabled: false, order: 15, description: "Domain registration via Namecheap or Cloudflare" }
];

export default function LayoutConfigPage() {
  const [panels, setPanels] = useState(DEFAULT_PANELS);
  const [saved, setSaved] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const categories = [...new Set(panels.map((p) => p.category))];

  function togglePanel(id: string) {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
    setSaved(false);
  }

  function movePanel(id: string, direction: "up" | "down") {
    setPanels((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= sorted.length) return prev;

      const current = sorted[idx]!;
      const swap = sorted[target]!;
      const newOrder = current.order;
      sorted[idx] = { ...current, order: swap.order };
      sorted[target] = { ...swap, order: newOrder };
      return sorted;
    });
    setSaved(false);
  }

  function resetToDefaults() {
    setPanels(DEFAULT_PANELS);
    setSaved(false);
  }

  function saveConfig() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const sortedPanels = [...panels].sort((a, b) => a.order - b.order);
  const enabledCount = panels.filter((p) => p.enabled).length;

  return (
    <div>
      <p className="aetheris-kicker">Customization</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Layout Configurator</h1>
      <p className="mt-2 text-sm text-muted">
        Choose which panels appear in the admin sidebar, reorder them and toggle visibility. Changes are saved to the whitelabel configuration.
      </p>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="aetheris-card p-4">
          <div className="flex items-center gap-3">
            <span className="aetheris-icon !h-9 !w-9">
              <LayoutGrid className="h-4 w-4" />
            </span>
            <div>
              <div className="text-lg font-bold tracking-tight">{panels.length}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-faint">Total panels</div>
            </div>
          </div>
        </div>
        <div className="aetheris-card p-4">
          <div className="flex items-center gap-3">
            <span className="aetheris-icon !h-9 !w-9">
              <Eye className="h-4 w-4" />
            </span>
            <div>
              <div className="text-lg font-bold tracking-tight">{enabledCount}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-faint">Visible</div>
            </div>
          </div>
        </div>
        <div className="aetheris-card p-4">
          <div className="flex items-center gap-3">
            <span className="aetheris-icon !h-9 !w-9">
              <EyeOff className="h-4 w-4" />
            </span>
            <div>
              <div className="text-lg font-bold tracking-tight">{panels.length - enabledCount}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-faint">Hidden</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={saveConfig} className="aetheris-btn-primary h-9 px-5 text-xs">
          <Save className="h-3.5 w-3.5" />
          {saved ? "Saved" : "Save configuration"}
        </button>
        <button type="button" onClick={resetToDefaults} className="aetheris-btn-secondary h-9 px-5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to defaults
        </button>
        {saved && (
          <span className="text-xs text-success">Configuration saved successfully.</span>
        )}
      </div>

      {/* Panel list by category */}
      {categories.map((category) => {
        const categoryPanels = sortedPanels.filter((p) => p.category === category);
        return (
          <section key={category} className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">{category}</h2>
            <div className="mt-3 space-y-2">
              {categoryPanels.map((panel) => {
                const Icon = panel.icon;
                return (
                  <div
                    key={panel.id}
                    className={`aetheris-card flex items-center gap-4 p-4 transition-all duration-200 ${
                      panel.enabled ? "" : "opacity-50"
                    }`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-faint" />

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold tracking-tight">{panel.name}</h3>
                        <span className="text-[10px] text-faint">Order: {panel.order}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted line-clamp-1">{panel.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => movePanel(panel.id, "up")}
                        disabled={sortedPanels[0]?.id === panel.id}
                        className="aetheris-btn-ghost h-7 w-7 p-0 text-xs disabled:opacity-30"
                      >
                        ^
                      </button>
                      <button
                        type="button"
                        onClick={() => movePanel(panel.id, "down")}
                        disabled={sortedPanels[sortedPanels.length - 1]?.id === panel.id}
                        className="aetheris-btn-ghost h-7 w-7 p-0 text-xs disabled:opacity-30"
                      >
                        v
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePanel(panel.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                          panel.enabled ? "bg-accent" : "bg-raised border border-edge"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            panel.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Preview */}
      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">Sidebar Preview</h2>
        <div className="mt-3 aetheris-card max-w-xs p-4">
          <div className="space-y-1">
            {sortedPanels
              .filter((p) => p.enabled)
              .map((panel) => {
                const Icon = panel.icon;
                return (
                  <div key={panel.id} className="flex h-8 items-center gap-2.5 rounded-lg px-3 text-xs text-muted">
                    <Icon className="h-3.5 w-3.5 text-faint" />
                    {panel.name}
                  </div>
                );
              })}
          </div>
        </div>
      </section>
    </div>
  );
}
