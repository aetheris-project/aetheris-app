"use client";

import { useState } from "react";
import {
  CreditCard,
  Bell,
  Wrench,
  Shield,
  Check,
  Download,
  Settings,
  ExternalLink,
  Search,
  Filter,
  Package
} from "lucide-react";

interface Addon {
  id: string;
  name: string;
  category: string;
  version: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  configFields?: { key: string; label: string; type: string; placeholder: string; value: string }[];
}

const CATEGORY_ICONS: Record<string, typeof CreditCard> = {
  "payment-gateway": CreditCard,
  notification: Bell,
  utility: Wrench,
  authentication: Shield
};

const CATEGORY_LABELS: Record<string, string> = {
  "payment-gateway": "Payment Gateways",
  notification: "Notifications",
  utility: "Utilities",
  authentication: "Authentication"
};

const INITIAL_ADDONS: Addon[] = [
  {
    id: "gateway-stripe",
    name: "Stripe",
    category: "payment-gateway",
    version: "1.0.0",
    description: "Accept credit cards, debit cards and local payment methods via Stripe.",
    enabled: true,
    configured: true,
    configFields: [
      { key: "secretKey", label: "Secret Key", type: "password", placeholder: "sk_live_...", value: "sk_live_***" },
      { key: "publishableKey", label: "Publishable Key", type: "text", placeholder: "pk_live_...", value: "pk_live_***" },
      { key: "webhookSecret", label: "Webhook Secret", type: "password", placeholder: "whsec_...", value: "whsec_***" }
    ]
  },
  {
    id: "gateway-paypal",
    name: "PayPal",
    category: "payment-gateway",
    version: "1.0.0",
    description: "Accept PayPal payments and invoicing through the PayPal Commerce Platform.",
    enabled: true,
    configured: true,
    configFields: [
      { key: "clientId", label: "Client ID", type: "text", placeholder: "Ae...", value: "Ae***" },
      { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "...", value: "***" }
    ]
  },
  {
    id: "gateway-mollie",
    name: "Mollie",
    category: "payment-gateway",
    version: "1.0.0",
    description: "European payment gateway supporting iDEAL, Bancontact, SOFORT and 25+ methods.",
    enabled: false,
    configured: false,
    configFields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "test_...", value: "" }
    ]
  },
  {
    id: "gateway-coinbase",
    name: "Coinbase Commerce",
    category: "payment-gateway",
    version: "1.0.0",
    description: "Accept crypto payments (BTC, ETH, USDC) through Coinbase Commerce.",
    enabled: false,
    configured: false,
    configFields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "...", value: "" },
      { key: "webhookSecret", label: "Webhook Secret", type: "password", placeholder: "...", value: "" }
    ]
  },
  {
    id: "gateway-adyen",
    name: "Adyen",
    category: "payment-gateway",
    version: "1.0.0",
    description: "Global payments platform with 250+ local payment methods.",
    enabled: false,
    configured: false,
    configFields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "AQ...", value: "" },
      { key: "merchantAccount", label: "Merchant Account", type: "text", placeholder: "MyCompanyECOM", value: "" }
    ]
  },
  {
    id: "gateway-braintree",
    name: "Braintree",
    category: "payment-gateway",
    version: "1.0.0",
    description: "PayPal-owned gateway for cards, PayPal and Venmo.",
    enabled: false,
    configured: false,
    configFields: [
      { key: "merchantId", label: "Merchant ID", type: "text", placeholder: "...", value: "" },
      { key: "publicKey", label: "Public Key", type: "text", placeholder: "...", value: "" },
      { key: "privateKey", label: "Private Key", type: "password", placeholder: "...", value: "" }
    ]
  },
  {
    id: "notify-discord",
    name: "Discord Notifications",
    category: "notification",
    version: "1.0.0",
    description: "Post embeds with server events and billing alerts to Discord webhooks.",
    enabled: true,
    configured: true,
    configFields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://discord.com/api/webhooks/...", value: "https://discord.com/api/webhooks/***" }
    ]
  },
  {
    id: "notify-slack",
    name: "Slack Notifications",
    category: "notification",
    version: "1.0.0",
    description: "Send billing, provisioning and alert messages to Slack channels.",
    enabled: false,
    configured: false,
    configFields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://hooks.slack.com/services/...", value: "" }
    ]
  },
  {
    id: "notify-telegram",
    name: "Telegram Notifications",
    category: "notification",
    version: "1.0.0",
    description: "Deliver platform alerts to a Telegram bot chat.",
    enabled: false,
    configured: false,
    configFields: [
      { key: "botToken", label: "Bot Token", type: "password", placeholder: "123456:ABC-...", value: "" },
      { key: "chatId", label: "Chat ID", type: "text", placeholder: "-100...", value: "" }
    ]
  },
  {
    id: "login-google",
    name: "Google Sign-In",
    category: "authentication",
    version: "1.0.0",
    description: "Allow users to sign in with their Google account via OAuth 2.0.",
    enabled: true,
    configured: true,
    configFields: [
      { key: "clientId", label: "Client ID", type: "text", placeholder: "...apps.googleusercontent.com", value: "***.apps.googleusercontent.com" },
      { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "...", value: "***" }
    ]
  },
  {
    id: "login-apple",
    name: "Apple Sign-In",
    category: "authentication",
    version: "1.0.0",
    description: "Allow users to sign in with their Apple ID.",
    enabled: false,
    configured: false,
    configFields: [
      { key: "teamId", label: "Team ID", type: "text", placeholder: "ABCDE12345", value: "" },
      { key: "serviceId", label: "Service ID", type: "text", placeholder: "com.example.aetheris", value: "" },
      { key: "keyId", label: "Key ID", type: "text", placeholder: "ABC123DEFG", value: "" }
    ]
  },
  {
    id: "login-discord",
    name: "Discord Sign-In",
    category: "authentication",
    version: "1.0.0",
    description: "Allow users to sign in with their Discord account via OAuth 2.0.",
    enabled: false,
    configured: false,
    configFields: [
      { key: "applicationId", label: "Application ID", type: "text", placeholder: "...", value: "" },
      { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "...", value: "" }
    ]
  },
  {
    id: "utility-webhook-logger",
    name: "Webhook Logger",
    category: "utility",
    version: "1.0.0",
    description: "Fan out platform events to arbitrary HTTP endpoints with retries.",
    enabled: false,
    configured: false,
    configFields: [
      { key: "endpoint", label: "Endpoint URL", type: "url", placeholder: "https://your-api.com/webhooks", value: "" }
    ]
  }
];

export default function AddonsPage() {
  const [addons, setAddons] = useState(INITIAL_ADDONS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAddon, setExpandedAddon] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, Record<string, string>>>({});

  const categories = [...new Set(addons.map((a) => a.category))];

  const filteredAddons = addons.filter((addon) => {
    const matchesCategory = !selectedCategory || addon.category === selectedCategory;
    const matchesSearch = !searchQuery || addon.name.toLowerCase().includes(searchQuery.toLowerCase()) || addon.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const enabledCount = addons.filter((a) => a.enabled).length;
  const configuredCount = addons.filter((a) => a.configured).length;

  function toggleAddon(id: string) {
    setAddons((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }

  function updateConfig(addonId: string, key: string, value: string) {
    setConfigValues((prev) => ({
      ...prev,
      [addonId]: { ...prev[addonId], [key]: value }
    }));
  }

  function saveConfig(addonId: string) {
    setAddons((prev) =>
      prev.map((a) => (a.id === addonId ? { ...a, configured: true } : a))
    );
    setExpandedAddon(null);
  }

  return (
    <div>
      <p className="aetheris-kicker">Addons</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Addon Configurator</h1>
      <p className="mt-2 text-sm text-muted">
        Configure and manage all available addons from the integration store. Enable, disable and set API keys for each module.
      </p>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Addons", value: String(addons.length), icon: Package },
          { label: "Enabled", value: String(enabledCount), icon: Check },
          { label: "Configured", value: String(configuredCount), icon: Settings },
          { label: "Categories", value: String(categories.length), icon: Filter }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="aetheris-card p-4">
              <div className="flex items-center gap-3">
                <span className="aetheris-icon !h-9 !w-9">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-lg font-bold tracking-tight">{stat.value}</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-faint">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and filter */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            placeholder="Search addons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="aetheris-input pl-10"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`aetheris-btn-ghost text-xs ${!selectedCategory ? "bg-accent-soft text-accent" : ""}`}
          >
            All
          </button>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] || Package;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`aetheris-btn-ghost text-xs gap-1.5 ${selectedCategory === cat ? "bg-accent-soft text-accent" : ""}`}
              >
                <Icon className="h-3 w-3" />
                {CATEGORY_LABELS[cat] || cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Addon list */}
      <div className="mt-6 space-y-3">
        {filteredAddons.map((addon) => {
          const Icon = CATEGORY_ICONS[addon.category] || Package;
          const isExpanded = expandedAddon === addon.id;
          const currentConfig = configValues[addon.id] || {};

          return (
            <div
              key={addon.id}
              className={`aetheris-card overflow-hidden transition-all duration-200 ${addon.enabled ? "border-accent/20" : ""}`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold tracking-tight">{addon.name}</h3>
                      <span className="rounded-full border border-edge bg-raised px-2 py-0.5 text-[9px] font-medium text-faint">
                        v{addon.version}
                      </span>
                      {addon.configured && (
                        <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[9px] font-medium text-success">
                          Configured
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted line-clamp-1">{addon.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedAddon(isExpanded ? null : addon.id)}
                    className="aetheris-btn-ghost h-8 px-3 text-xs"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Configure
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAddon(addon.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                      addon.enabled ? "bg-accent" : "bg-raised border border-edge"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        addon.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Expanded config panel */}
              {isExpanded && addon.configFields && (
                <div className="border-t border-edge bg-raised/30 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-faint">Configuration</h4>
                    <a
                      href={`https://aetheris-docs.vercel.app/addons#${addon.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-accent hover:underline"
                    >
                      View docs <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {addon.configFields.map((field) => (
                      <div key={field.key}>
                        <label className="mb-1.5 block text-[11px] font-medium text-muted">{field.label}</label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={currentConfig[field.key] ?? field.value}
                          onChange={(e) => updateConfig(addon.id, field.key, e.target.value)}
                          className="aetheris-input text-xs"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => saveConfig(addon.id)}
                      className="aetheris-btn-primary h-8 px-4 text-xs"
                    >
                      <Check className="h-3 w-3" />
                      Save configuration
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedAddon(null)}
                      className="aetheris-btn-ghost h-8 px-4 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredAddons.length === 0 && (
          <div className="aetheris-card p-12 text-center">
            <Package className="mx-auto h-8 w-8 text-faint" />
            <p className="mt-3 text-sm text-muted">No addons found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
