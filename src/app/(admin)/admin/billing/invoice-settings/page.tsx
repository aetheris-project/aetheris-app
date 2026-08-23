"use client";

import { useState } from "react";
import {
  Mail,
  FileText,
  Palette,
  Globe,
  CreditCard,
  Save,
  Eye,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Settings,
  Send,
  Clock,
  DollarSign,
  Percent,
  Hash,
  Building,
  MapPin,
  Phone,
  AtSign
} from "lucide-react";

interface InvoiceSettings {
  // Branding
  companyName: string;
  companyTagline: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  // Contact
  email: string;
  phone: string;
  address: string;
  website: string;
  vatNumber: string;
  taxId: string;
  // Invoice defaults
  currency: string;
  currencySymbol: string;
  taxRate: number;
  taxName: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  paymentTerms: number;
  lateFeePercent: number;
  lateFeeEnabled: boolean;
  // Email
  senderName: string;
  senderEmail: string;
  replyTo: string;
  bccEmail: string;
  // Dunning
  dunningEnabled: boolean;
  dunningDays: number[];
  dunningMaxRetries: number;
}

const DEFAULT_SETTINGS: InvoiceSettings = {
  companyName: "Aetheris",
  companyTagline: "Billing and virtualization control panel",
  logoUrl: "/logo.svg",
  primaryColor: "#10B981",
  secondaryColor: "#059669",
  email: "billing@another-horizon.eu",
  phone: "",
  address: "",
  website: "https://aetheris-web.vercel.app",
  vatNumber: "",
  taxId: "",
  currency: "USD",
  currencySymbol: "$",
  taxRate: 0,
  taxName: "VAT",
  invoicePrefix: "INV",
  nextInvoiceNumber: 422,
  paymentTerms: 30,
  lateFeePercent: 1.5,
  lateFeeEnabled: false,
  senderName: "Aetheris Billing",
  senderEmail: "billing@another-horizon.eu",
  replyTo: "hello@another-horizon.eu",
  bccEmail: "",
  dunningEnabled: true,
  dunningDays: [3, 7, 14],
  dunningMaxRetries: 3
};

const EMAIL_VARIABLES = [
  { key: "{{invoice.id}}", description: "Invoice number" },
  { key: "{{invoice.amount}}", description: "Total amount" },
  { key: "{{invoice.due_date}}", description: "Due date" },
  { key: "{{client.name}}", description: "Client name" },
  { key: "{{client.email}}", description: "Client email" },
  { key: "{{client.company}}", description: "Company name" },
  { key: "{{plan.name}}", description: "Plan name" },
  { key: "{{plan.price}}", description: "Plan price" },
  { key: "{{company.name}}", description: "Your company name" },
  { key: "{{company.email}}", description: "Your company email" },
  { key: "{{payment.url}}", description: "Payment link" },
  { key: "{{invoice.notes}}", description: "Invoice notes" },
  { key: "{{invoice.items}}", description: "Line items table" },
  { key: "{{invoice.subtotal}}", description: "Subtotal before tax" },
  { key: "{{invoice.tax}}", description: "Tax amount" },
  { key: "{{invoice.total}}", description: "Total with tax" }
];

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "\u20AC", name: "Euro" },
  { code: "GBP", symbol: "\u00A3", name: "British Pound" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "JPY", symbol: "\u00A5", name: "Japanese Yen" }
];

const EMAIL_TEMPLATES = {
  invoiceCreated: {
    name: "Invoice Created",
    subject: "Invoice {{invoice.id}} from {{company.name}}",
    body: `Dear {{client.name}},

A new invoice has been generated for your account.

Invoice: {{invoice.id}}
Amount: {{invoice.amount}}
Due Date: {{invoice.due_date}}
Plan: {{plan.name}}

Please review the invoice and submit payment before the due date.

Pay now: {{payment.url}}

If you have any questions, contact us at {{company.email}}.

Best regards,
{{company.name}}`
  },
  paymentReceived: {
    name: "Payment Received",
    subject: "Payment confirmation - {{invoice.id}}",
    body: `Dear {{client.name}},

We have received your payment for invoice {{invoice.id}}.

Amount paid: {{invoice.amount}}
Date: {{invoice.due_date}}

Thank you for your business!

Best regards,
{{company.name}}`
  },
  invoiceOverdue: {
    name: "Payment Overdue",
    subject: "OVERDUE: Invoice {{invoice.id}} - Action required",
    body: `Dear {{client.name}},

Your invoice {{invoice.id}} for {{invoice.amount}} was due on {{invoice.due_date}} and is now overdue.

Please submit payment immediately to avoid service interruption.

Pay now: {{payment.url}}

If you have already paid, please disregard this notice.

Best regards,
{{company.name}}`
  },
  paymentFailed: {
    name: "Payment Failed",
    subject: "Payment failed for invoice {{invoice.id}}",
    body: `Dear {{client.name}},

We were unable to process your payment for invoice {{invoice.id}}.

Amount: {{invoice.amount}}
Reason: Payment method declined

Please update your payment method and try again: {{payment.url}}

If you need assistance, contact us at {{company.email}}.

Best regards,
{{company.name}}`
  },
  subscriptionRenewal: {
    name: "Subscription Renewal",
    subject: "Subscription renewal - {{plan.name}}",
    body: `Dear {{client.name}},

Your subscription for {{plan.name}} will automatically renew on {{invoice.due_date}}.

Amount: {{invoice.amount}}

To cancel or modify your subscription, visit your account dashboard.

Best regards,
{{company.name}}`
  },
  refundIssued: {
    name: "Refund Issued",
    subject: "Refund processed - {{invoice.id}}",
    body: `Dear {{client.name}},

A refund has been processed for invoice {{invoice.id}}.

Refund amount: {{invoice.amount}}

The refund will appear on your statement within 5-10 business days.

Best regards,
{{company.name}}`
  }
};

export default function InvoiceSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<"branding" | "invoice" | "email" | "templates" | "dunning">("branding");
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof EMAIL_TEMPLATES>("invoiceCreated");
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  function updateSetting<K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function saveSettings() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function resetDefaults() {
    setSettings(DEFAULT_SETTINGS);
    setSaved(false);
  }

  const tabs = [
    { id: "branding" as const, label: "Branding", icon: Palette },
    { id: "invoice" as const, label: "Invoice", icon: FileText },
    { id: "email" as const, label: "Email", icon: Mail },
    { id: "templates" as const, label: "Templates", icon: Settings },
    { id: "dunning" as const, label: "Dunning", icon: Clock }
  ];

  return (
    <div>
      <p className="aetheris-kicker">Billing</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Invoice & Email Settings</h1>
      <p className="mt-2 text-sm text-muted">
        Configure invoice branding, email templates, payment terms and automated dunning sequences.
      </p>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 overflow-x-auto rounded-xl border border-edge bg-raised/40 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-accent-soft text-accent shadow-sm"
                  : "text-muted hover:text-ink hover:bg-raised"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={saveSettings} className="aetheris-btn-primary h-9 px-5 text-xs">
          <Save className="h-3.5 w-3.5" />
          {saved ? "Saved" : "Save settings"}
        </button>
        <button type="button" onClick={resetDefaults} className="aetheris-btn-secondary h-9 px-5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset defaults
        </button>
        {saved && <span className="text-xs text-success">Settings saved successfully.</span>}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {/* BRANDING TAB */}
        {activeTab === "branding" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="aetheris-card p-6">
              <h3 className="text-sm font-semibold tracking-tight">Company Information</h3>
              <p className="mt-1 text-xs text-muted">Displayed on invoices and email footers.</p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted">Company name</label>
                  <input type="text" value={settings.companyName} onChange={(e) => updateSetting("companyName", e.target.value)} className="aetheris-input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted">Tagline</label>
                  <input type="text" value={settings.companyTagline} onChange={(e) => updateSetting("companyTagline", e.target.value)} className="aetheris-input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted">Logo URL</label>
                  <input type="url" value={settings.logoUrl} onChange={(e) => updateSetting("logoUrl", e.target.value)} className="aetheris-input" placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Primary color</label>
                    <div className="flex gap-2">
                      <input type="color" value={settings.primaryColor} onChange={(e) => updateSetting("primaryColor", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-edge" />
                      <input type="text" value={settings.primaryColor} onChange={(e) => updateSetting("primaryColor", e.target.value)} className="aetheris-input flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Secondary color</label>
                    <div className="flex gap-2">
                      <input type="color" value={settings.secondaryColor} onChange={(e) => updateSetting("secondaryColor", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-edge" />
                      <input type="text" value={settings.secondaryColor} onChange={(e) => updateSetting("secondaryColor", e.target.value)} className="aetheris-input flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="aetheris-card p-6">
              <h3 className="text-sm font-semibold tracking-tight">Contact & Legal</h3>
              <p className="mt-1 text-xs text-muted">Required for invoice compliance in most jurisdictions.</p>
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Email</label>
                    <input type="email" value={settings.email} onChange={(e) => updateSetting("email", e.target.value)} className="aetheris-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Phone</label>
                    <input type="tel" value={settings.phone} onChange={(e) => updateSetting("phone", e.target.value)} className="aetheris-input" placeholder="+1..." />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted">Address</label>
                  <input type="text" value={settings.address} onChange={(e) => updateSetting("address", e.target.value)} className="aetheris-input" placeholder="Street, City, Country" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted">Website</label>
                  <input type="url" value={settings.website} onChange={(e) => updateSetting("website", e.target.value)} className="aetheris-input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">VAT Number</label>
                    <input type="text" value={settings.vatNumber} onChange={(e) => updateSetting("vatNumber", e.target.value)} className="aetheris-input" placeholder="IT12345678901" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Tax ID</label>
                    <input type="text" value={settings.taxId} onChange={(e) => updateSetting("taxId", e.target.value)} className="aetheris-input" />
                  </div>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="aetheris-card p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-tight">Invoice Preview</h3>
                <span className="text-[10px] text-faint">Live preview with current branding</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-edge bg-white p-8 text-[#18181b]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-2xl font-bold" style={{ color: settings.primaryColor }}>{settings.companyName}</div>
                    <div className="mt-1 text-xs text-[#52525b]">{settings.companyTagline}</div>
                    {settings.address && <div className="mt-2 text-xs text-[#52525b]">{settings.address}</div>}
                    {settings.vatNumber && <div className="text-xs text-[#52525b]">VAT: {settings.vatNumber}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">INVOICE</div>
                    <div className="font-mono text-sm text-[#52525b]">{settings.invoicePrefix}-{String(settings.nextInvoiceNumber).padStart(5, "0")}</div>
                    <div className="mt-2 text-xs text-[#52525b]">Date: Aug 23, 2026</div>
                    <div className="text-xs text-[#52525b]">Due: Sep 22, 2026</div>
                  </div>
                </div>
                <div className="mt-8 border-t border-[#e4e4e7] pt-4">
                  <div className="text-xs font-semibold text-[#52525b]">Bill To:</div>
                  <div className="mt-1 text-sm font-medium">Acme Corp</div>
                  <div className="text-xs text-[#52525b]">billing@acme.com</div>
                </div>
                <table className="mt-6 w-full text-left text-sm">
                  <thead className="text-xs text-[#52525b]">
                    <tr className="border-b border-[#e4e4e7]">
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 text-right font-medium">Qty</th>
                      <th className="pb-2 text-right font-medium">Price</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#e4e4e7]">
                      <td className="py-3">Growth Plan - Monthly</td>
                      <td className="py-3 text-right">4</td>
                      <td className="py-3 text-right">{settings.currencySymbol}49.00</td>
                      <td className="py-3 text-right font-medium">{settings.currencySymbol}196.00</td>
                    </tr>
                    <tr className="border-b border-[#e4e4e7]">
                      <td className="py-3">Additional Storage (100GB)</td>
                      <td className="py-3 text-right">1</td>
                      <td className="py-3 text-right">{settings.currencySymbol}9.90</td>
                      <td className="py-3 text-right font-medium">{settings.currencySymbol}9.90</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-4 flex justify-end">
                  <div className="w-48 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#52525b]">Subtotal</span><span>{settings.currencySymbol}205.90</span></div>
                    {settings.taxRate > 0 && (
                      <div className="flex justify-between"><span className="text-[#52525b]">{settings.taxName} ({settings.taxRate}%)</span><span>{settings.currencySymbol}{(205.90 * settings.taxRate / 100).toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between border-t border-[#e4e4e7] pt-2 font-bold"><span>Total</span><span style={{ color: settings.primaryColor }}>{settings.currencySymbol}{(205.90 * (1 + settings.taxRate / 100)).toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="mt-8 border-t border-[#e4e4e7] pt-4 text-center text-xs text-[#52525b]">
                  {settings.website && <div>Payment due within {settings.paymentTerms} days</div>}
                  <div className="mt-1">{settings.companyName} | {settings.email}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVOICE TAB */}
        {activeTab === "invoice" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="aetheris-card p-6">
              <h3 className="text-sm font-semibold tracking-tight">Invoice Defaults</h3>
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Invoice prefix</label>
                    <input type="text" value={settings.invoicePrefix} onChange={(e) => updateSetting("invoicePrefix", e.target.value)} className="aetheris-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Next number</label>
                    <input type="number" value={settings.nextInvoiceNumber} onChange={(e) => updateSetting("nextInvoiceNumber", parseInt(e.target.value) || 1)} className="aetheris-input" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted">Payment terms (days)</label>
                  <input type="number" value={settings.paymentTerms} onChange={(e) => updateSetting("paymentTerms", parseInt(e.target.value) || 30)} className="aetheris-input" />
                </div>
              </div>
            </div>

            <div className="aetheris-card p-6">
              <h3 className="text-sm font-semibold tracking-tight">Currency & Tax</h3>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted">Currency</label>
                  <select value={settings.currency} onChange={(e) => { const c = CURRENCIES.find((x) => x.code === e.target.value); updateSetting("currency", e.target.value); if (c) updateSetting("currencySymbol", c.symbol); }} className="aetheris-input">
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.symbol} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Tax rate (%)</label>
                    <input type="number" step="0.01" value={settings.taxRate} onChange={(e) => updateSetting("taxRate", parseFloat(e.target.value) || 0)} className="aetheris-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Tax name</label>
                    <input type="text" value={settings.taxName} onChange={(e) => updateSetting("taxName", e.target.value)} className="aetheris-input" />
                  </div>
                </div>
              </div>
            </div>

            <div className="aetheris-card p-6">
              <h3 className="text-sm font-semibold tracking-tight">Late Fees</h3>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Enable late fees</div>
                    <div className="text-xs text-muted">Automatically add fees to overdue invoices</div>
                  </div>
                  <button type="button" onClick={() => updateSetting("lateFeeEnabled", !settings.lateFeeEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.lateFeeEnabled ? "bg-accent" : "bg-raised border border-edge"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.lateFeeEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {settings.lateFeeEnabled && (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Late fee percentage per month</label>
                    <input type="number" step="0.1" value={settings.lateFeePercent} onChange={(e) => updateSetting("lateFeePercent", parseFloat(e.target.value) || 0)} className="aetheris-input" />
                  </div>
                )}
              </div>
            </div>

            <div className="aetheris-card p-6">
              <h3 className="text-sm font-semibold tracking-tight">Invoice Number Preview</h3>
              <div className="mt-5">
                <div className="rounded-xl border border-edge bg-raised/40 p-6 text-center">
                  <div className="text-xs text-faint">Next invoice will be numbered</div>
                  <div className="mt-2 font-mono text-3xl font-bold tracking-tight">
                    {settings.invoicePrefix}-{String(settings.nextInvoiceNumber).padStart(5, "0")}
                  </div>
                  <div className="mt-2 text-xs text-muted">{settings.invoicePrefix}-{String(settings.nextInvoiceNumber - 1).padStart(5, "0")}, {settings.invoicePrefix}-{String(settings.nextInvoiceNumber - 2).padStart(5, "0")}, ...</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMAIL TAB */}
        {activeTab === "email" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="aetheris-card p-6">
              <h3 className="text-sm font-semibold tracking-tight">Email Configuration</h3>
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Sender name</label>
                    <input type="text" value={settings.senderName} onChange={(e) => updateSetting("senderName", e.target.value)} className="aetheris-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Sender email</label>
                    <input type="email" value={settings.senderEmail} onChange={(e) => updateSetting("senderEmail", e.target.value)} className="aetheris-input" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted">Reply-to address</label>
                  <input type="email" value={settings.replyTo} onChange={(e) => updateSetting("replyTo", e.target.value)} className="aetheris-input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted">BCC email (optional)</label>
                  <input type="email" value={settings.bccEmail} onChange={(e) => updateSetting("bccEmail", e.target.value)} className="aetheris-input" placeholder="archive@yourdomain.com" />
                </div>
              </div>
            </div>

            <div className="aetheris-card p-6">
              <h3 className="text-sm font-semibold tracking-tight">Email Variables</h3>
              <p className="mt-1 text-xs text-muted">Use these placeholders in your email templates.</p>
              <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
                {EMAIL_VARIABLES.map((v) => (
                  <div key={v.key} className="flex items-center justify-between rounded-lg border border-edge px-3 py-2">
                    <code className="font-mono text-xs text-accent">{v.key}</code>
                    <span className="text-[10px] text-faint">{v.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === "templates" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="aetheris-card p-6">
              <h3 className="text-sm font-semibold tracking-tight">Email Templates</h3>
              <div className="mt-4 space-y-2">
                {(Object.keys(EMAIL_TEMPLATES) as Array<keyof typeof EMAIL_TEMPLATES>).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTemplate(key)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                      selectedTemplate === key ? "bg-accent-soft text-accent" : "text-muted hover:bg-raised"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {EMAIL_TEMPLATES[key].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="aetheris-card p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-tight">{EMAIL_TEMPLATES[selectedTemplate].name}</h3>
                <button type="button" onClick={() => setShowPreview(!showPreview)} className="aetheris-btn-ghost h-8 px-3 text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  {showPreview ? "Edit" : "Preview"}
                </button>
              </div>

              {showPreview ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-edge bg-white p-6 text-sm text-[#18181b]">
                  <div className="border-b border-[#e4e4e7] pb-4">
                    <div className="text-xs text-[#52525b]">From: {settings.senderName} &lt;{settings.senderEmail}&gt;</div>
                    <div className="text-xs text-[#52525b]">Subject: {EMAIL_TEMPLATES[selectedTemplate].subject}</div>
                  </div>
                  <div className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7">
                    {EMAIL_TEMPLATES[selectedTemplate].body}
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Subject line</label>
                    <input type="text" defaultValue={EMAIL_TEMPLATES[selectedTemplate].subject} className="aetheris-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Email body</label>
                    <textarea
                      defaultValue={EMAIL_TEMPLATES[selectedTemplate].body}
                      rows={16}
                      className="aetheris-input resize-y font-mono text-xs leading-6"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DUNNING TAB */}
        {activeTab === "dunning" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="aetheris-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Automated Dunning</h3>
                  <p className="mt-1 text-xs text-muted">Send payment reminders automatically for overdue invoices.</p>
                </div>
                <button type="button" onClick={() => updateSetting("dunningEnabled", !settings.dunningEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.dunningEnabled ? "bg-accent" : "bg-raised border border-edge"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.dunningEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {settings.dunningEnabled && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Reminder days after due date</label>
                    <div className="flex gap-2">
                      {settings.dunningDays.map((day, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input
                            type="number"
                            value={day}
                            onChange={(e) => {
                              const newDays = [...settings.dunningDays];
                              newDays[i] = parseInt(e.target.value) || 0;
                              updateSetting("dunningDays", newDays);
                            }}
                            className="aetheris-input w-16 text-center text-xs"
                          />
                          <span className="text-[10px] text-faint">days</span>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateSetting("dunningDays", [...settings.dunningDays, settings.dunningDays[settings.dunningDays.length - 1]! + 7])}
                        className="aetheris-btn-ghost h-9 w-9 p-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted">Max retries before suspension</label>
                    <input type="number" value={settings.dunningMaxRetries} onChange={(e) => updateSetting("dunningMaxRetries", parseInt(e.target.value) || 3)} className="aetheris-input w-24" />
                  </div>
                </div>
              )}
            </div>

            <div className="aetheris-card p-6">
              <h3 className="text-sm font-semibold tracking-tight">Dunning Timeline</h3>
              <div className="mt-5">
                <div className="relative space-y-6 pl-6">
                  <div className="absolute left-2.5 top-0 h-full w-px bg-edge" />
                  <div className="relative">
                    <div className="absolute -left-[11px] top-1 h-2 w-2 rounded-full bg-accent" />
                    <div className="text-xs font-semibold">Invoice issued</div>
                    <div className="text-[10px] text-faint">Day 0 - Invoice sent via email</div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[11px] top-1 h-2 w-2 rounded-full bg-warning" />
                    <div className="text-xs font-semibold">Payment due</div>
                    <div className="text-[10px] text-faint">Day {settings.paymentTerms} - Payment expected</div>
                  </div>
                  {settings.dunningEnabled && settings.dunningDays.map((day, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[11px] top-1 h-2 w-2 rounded-full bg-danger" />
                      <div className="text-xs font-semibold">Reminder #{i + 1}</div>
                      <div className="text-[10px] text-faint">Day {settings.paymentTerms + day} - Email reminder sent</div>
                    </div>
                  ))}
                  <div className="relative">
                    <div className="absolute -left-[11px] top-1 h-2 w-2 rounded-full bg-danger" />
                    <div className="text-xs font-semibold">Service suspension</div>
                    <div className="text-[10px] text-faint">After {settings.dunningMaxRetries} failed attempts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
