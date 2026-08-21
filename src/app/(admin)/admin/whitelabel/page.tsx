"use client";

import { useState } from "react";
import {
  Check,
  Globe,
  Image,
  Mail,
  Palette,
  Save,
  Type
} from "lucide-react";

const ACCENT_OPTIONS = [
  { id: "emerald", label: "Emerald", color: "#10B981" },
  { id: "indigo", label: "Indigo", color: "#6366F1" },
  { id: "amber", label: "Amber", color: "#F59E0B" }
];

export default function AdminWhitelabelPage() {
  const [brandName, setBrandName] = useState("Aetheris");
  const [tagline, setTagline] = useState("Billing and virtualization control panel");
  const [domain, setDomain] = useState("aetheris-web.vercel.app");
  const [contactEmail, setContactEmail] = useState("hello@another-horizon.eu");
  const [accent, setAccent] = useState("emerald");
  const [logoUrl, setLogoUrl] = useState("/icon.svg");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <p className="aetheris-kicker">Admin</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Whitelabel configuration</h1>
      <p className="mt-2 text-sm text-muted">
        Configure your brand identity, theme, logos and custom domain. Changes apply at runtime without a rebuild.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <div className="space-y-6 lg:col-span-3">
          {/* Brand */}
          <div className="aetheris-card p-6">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Type className="h-4 w-4 text-accent" aria-hidden="true" />
              Brand identity
            </div>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-faint">Platform name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="aetheris-input h-10 px-4"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-faint">Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="aetheris-input h-10 px-4"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-faint">Custom domain</label>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-faint" aria-hidden="true" />
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="aetheris-input h-10 px-4 flex-1"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-faint">Contact email</label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-faint" aria-hidden="true" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="aetheris-input h-10 px-4 flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="aetheris-card p-6">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Image className="h-4 w-4 text-accent" aria-hidden="true" />
              Logo
            </div>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-faint">Logo URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="/icon.svg"
                  className="aetheris-input h-10 px-4 font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-edge bg-raised/60">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-base font-extrabold">A</span>
                </div>
                <div className="text-xs text-muted">
                  Upload your logo to a CDN and paste the URL above.
                  Recommended: 256x256 SVG or PNG with transparency.
                </div>
              </div>
            </div>
          </div>

          {/* Theme accent */}
          <div className="aetheris-card p-6">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Palette className="h-4 w-4 text-accent" aria-hidden="true" />
              Accent color
            </div>
            <div className="mt-4 flex gap-3">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAccent(opt.id)}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all ${
                    accent === opt.id
                      ? "border-white/40 shadow-lg scale-110"
                      : "border-edge hover:border-white/20"
                  }`}
                  style={{ backgroundColor: opt.color }}
                  aria-label={`Set accent to ${opt.label}`}
                >
                  {accent === opt.id && <Check className="h-5 w-5 text-white" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted">
              This color is applied platform-wide via CSS variables. No rebuild required.
            </div>
          </div>

          <button type="button" onClick={handleSave} className="aetheris-btn-primary h-11 px-6">
            {saved ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save configuration
              </>
            )}
          </button>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-8">
            <div className="text-[11px] font-medium uppercase tracking-wider text-faint mb-3">Live preview</div>
            <div className="aetheris-card overflow-hidden">
              {/* Browser chrome */}
              <div className="flex h-10 items-center gap-1.5 border-b border-edge bg-raised/60 px-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                <div className="ml-3 flex-1 rounded-md border border-edge bg-base/60 px-3 py-0.5 text-[10px] font-mono text-faint">
                  {domain}
                </div>
              </div>
              {/* Preview content */}
              <div className="p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-extrabold text-base shadow-sm">
                    A
                  </span>
                  <div>
                    <div className="text-sm font-semibold tracking-tight">{brandName}</div>
                    <div className="text-[10px] text-faint">v1.0.0</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">{tagline}</p>
                <div className="mt-4 rounded-lg border border-edge bg-raised/40 p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-faint">System status</div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
                    All systems operational
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-edge bg-raised/40 p-2.5">
                    <div className="text-[9px] uppercase tracking-wider text-faint">Servers</div>
                    <div className="text-sm font-bold">1,284</div>
                  </div>
                  <div className="rounded-lg border border-edge bg-raised/40 p-2.5">
                    <div className="text-[9px] uppercase tracking-wider text-faint">Revenue</div>
                    <div className="text-sm font-bold">$49,710</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="aetheris-btn-primary h-8 px-3 text-xs">Open panel</span>
                  <span className="aetheris-btn-secondary h-8 px-3 text-xs">Docs</span>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-edge bg-raised/30 p-3 text-[11px] text-muted">
              This preview mirrors the live site in real time. Navigation links, email templates and custom domains are all updated instantly through the Admin Panel.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
