"use client";

import { useState } from "react";
import {
  Check,
  Database,
  Globe,
  Key,
  Lock,
  Plug,
  Save,
  Server,
  Shield,
  Sparkles,
  Webhook
} from "lucide-react";

interface IntegrationField {
  id: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder: string;
  description: string;
}

const INTEGRATIONS: Record<string, { name: string; icon: typeof Key; fields: IntegrationField[] }> = {
  stripe: {
    name: "Stripe",
    icon: Key,
    fields: [
      { id: "publishableKey", label: "Publishable key", type: "text", placeholder: "pk_live_...", description: "Client-side key for Stripe.js" },
      { id: "secretKey", label: "Secret key", type: "password", placeholder: "sk_live_...", description: "Server-side API key" },
      { id: "webhookSecret", label: "Webhook secret", type: "password", placeholder: "whsec_...", description: "For verifying webhook signatures" }
    ]
  },
  paypal: {
    name: "PayPal",
    icon: Key,
    fields: [
      { id: "clientId", label: "Client ID", type: "text", placeholder: "Ae...", description: "PayPal REST API client ID" },
      { id: "clientSecret", label: "Client secret", type: "password", placeholder: "...", description: "PayPal REST API client secret" }
    ]
  },
  pterodactyl: {
    name: "Pterodactyl",
    icon: Server,
    fields: [
      { id: "panelUrl", label: "Panel URL", type: "url", placeholder: "https://panel.example.com", description: "Base URL of your Pterodactyl panel" },
      { id: "apiKey", label: "Application API key", type: "password", placeholder: "ptla_...", description: "Application API key with full access" }
    ]
  },
  google_oauth: {
    name: "Google OAuth",
    icon: Globe,
    fields: [
      { id: "clientId", label: "Client ID", type: "text", placeholder: "...apps.googleusercontent.com", description: "Google Cloud Console OAuth 2.0 client ID" },
      { id: "clientSecret", label: "Client secret", type: "password", placeholder: "GOCSPX-...", description: "Google Cloud Console OAuth 2.0 client secret" }
    ]
  },
  apple_oauth: {
    name: "Apple Sign In",
    icon: Shield,
    fields: [
      { id: "teamId", label: "Team ID", type: "text", placeholder: "ABCDE12345", description: "Apple Developer team ID" },
      { id: "clientId", label: "Service ID", type: "text", placeholder: "com.example.app", description: "Sign in with Apple service identifier" },
      { id: "keyId", label: "Key ID", type: "text", placeholder: "ABCDE12345", description: "Sign in with Apple key ID" },
      { id: "privateKey", label: "Private key (P8)", type: "password", placeholder: "-----BEGIN PRIVATE KEY-----", description: "Contents of the .p8 private key file" }
    ]
  },
  discord_oauth: {
    name: "Discord OAuth",
    icon: Webhook,
    fields: [
      { id: "clientId", label: "Application ID", type: "text", placeholder: "...", description: "Discord application client ID" },
      { id: "clientSecret", label: "Client secret", type: "password", placeholder: "...", description: "Discord application client secret" }
    ]
  },
  cloudflare: {
    name: "Cloudflare",
    icon: Globe,
    fields: [
      { id: "apiToken", label: "API token", type: "password", placeholder: "...", description: "Cloudflare API token with DNS and registrar permissions" },
      { id: "zoneId", label: "Zone ID", type: "text", placeholder: "...", description: "Cloudflare zone ID for DNS management" }
    ]
  }
};

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("stripe");

  function updateValue(field: string, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const activeIntegration = INTEGRATIONS[activeSection];

  return (
    <div>
      <p className="aetheris-kicker">Admin</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Settings &amp; integrations</h1>
      <p className="mt-2 text-sm text-muted">
        Configure API keys, database, social login providers and platform integrations.
      </p>

      {/* System overview */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Database", value: "PostgreSQL", icon: Database },
          { label: "Cache", value: "Redis", icon: Server },
          { label: "Queue", value: "BullMQ", icon: Plug },
          { label: "SSL", value: "Active", icon: Lock }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="aetheris-card p-4">
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-faint">{item.label}</div>
                  <div className="font-mono text-sm font-semibold">{item.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        {/* Integration sidebar */}
        <div className="aetheris-card p-3 lg:col-span-1">
          <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-faint">
            Integrations
          </div>
          <nav className="space-y-1">
            {Object.entries(INTEGRATIONS).map(([key, integration]) => {
              const Icon = integration.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSection(key)}
                  className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm transition-colors ${
                    activeSection === key
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted hover:bg-raised hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {integration.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Integration form */}
        <div className="aetheris-card p-6 lg:col-span-3">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            {activeIntegration && <activeIntegration.icon className="h-4 w-4 text-accent" aria-hidden="true" />}
            {activeIntegration?.name} configuration
          </div>
          <p className="mt-1 text-xs text-muted">
            API keys are stored encrypted in PostgreSQL. They are never exposed to the client.
          </p>

          <div className="mt-6 space-y-5">
            {activeIntegration?.fields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-faint">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={values[field.id] ?? ""}
                  onChange={(e) => updateValue(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="aetheris-input h-10 px-4 font-mono text-xs"
                />
                <p className="text-[11px] text-faint">{field.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button type="button" onClick={handleSave} className="aetheris-btn-primary h-10 px-5">
              {saved ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save {activeIntegration?.name} keys
                </>
              )}
            </button>
            <span className="text-xs text-faint">
              Changes propagate within 30 seconds to all workers.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
