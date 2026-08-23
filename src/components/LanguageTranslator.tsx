"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", flag: "EN", native: "English" },
  { code: "it", label: "Italian", flag: "IT", native: "Italiano" },
  { code: "es", label: "Spanish", flag: "ES", native: "Espanol" },
  { code: "fr", label: "French", flag: "FR", native: "Francais" },
  { code: "de", label: "German", flag: "DE", native: "Deutsch" },
  { code: "pt", label: "Portuguese", flag: "PT", native: "Portugues" },
  { code: "nl", label: "Dutch", flag: "NL", native: "Nederlands" },
  { code: "pl", label: "Polish", flag: "PL", native: "Polski" },
  { code: "ru", label: "Russian", flag: "RU", native: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439" },
  { code: "ja", label: "Japanese", flag: "JA", native: "\u65e5\u672c\u8a9e" },
  { code: "zh-CN", label: "Chinese", flag: "ZH", native: "\u4e2d\u6587" },
  { code: "ko", label: "Korean", flag: "KO", native: "\ud55c\uad6d\uc5b4" }
];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteAllGoogtrans() {
  if (typeof document === "undefined") return;
  const domains = ["", `.${window.location.hostname}`];
  if (window.location.hostname.endsWith(".vercel.app")) domains.push(".vercel.app");
  for (const domain of domains) {
    for (const path of ["/", ""]) {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

function getCurrentLang(): string {
  const cookie = getCookie("googtrans");
  if (!cookie) return "en";
  const match = cookie.match(/\/en\/([a-zA-Z-]+)/);
  const code = match?.[1];
  if (code && LANGUAGES.some((l) => l.code === code)) return code;
  return "en";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: (new (options: Record<string, unknown>, id: string) => void) & {
          InlineLayout?: { SIMPLE: number };
        };
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

/**
 * Load the Google Translate script and initialize the hidden widget.
 * The widget reads the googtrans cookie on load and translates the page.
 */
function ensureGoogleTranslate() {
  if (typeof document === "undefined") return;

  // Already loaded
  if (document.getElementById("aetheris-gt-script")) {
    // Re-init if widget not yet created
    if (window.google?.translate?.TranslateElement) {
      initWidget();
    }
    return;
  }

  // Create hidden container
  if (!document.getElementById("aetheris-gt-container")) {
    const el = document.createElement("div");
    el.id = "aetheris-gt-container";
    el.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;pointer-events:none;";
    document.body.appendChild(el);
  }

  // Style overrides to hide Google Translate UI
  if (!document.getElementById("aetheris-gt-style")) {
    const style = document.createElement("style");
    style.id = "aetheris-gt-style";
    style.textContent = `
      .goog-te-banner-frame, .goog-te-banner-framebody,
      .goog-te-balloon-frame, .goog-te-spinner,
      body > .skiptranslate { display:none !important; visibility:hidden !important; height:0 !important; width:0 !important; overflow:hidden !important; position:absolute !important; left:-9999px !important; top:-9999px !important; pointer-events:none !important; }
      html { top:0 !important; }
      body { top:0 !important; margin-top:0 !important; }
      .goog-te-banner-frame + body { top:0 !important; margin-top:0 !important; }
      font[class^="goog-te"] { background:transparent !important; font-family:inherit !important; }
    `;
    document.head.appendChild(style);
  }

  // Define init callback
  window.googleTranslateElementInit = () => {
    initWidget();
  };

  // Load the script
  const script = document.createElement("script");
  script.id = "aetheris-gt-script";
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  script.onerror = () => {
    // Network blocked - silently degrade
  };
  document.head.appendChild(script);
}

function initWidget() {
  if (!window.google?.translate?.TranslateElement) return;
  try {
    const container = document.getElementById("aetheris-gt-container");
    if (!container) return;
    // Prevent double init
    if (container.querySelector("iframe")) return;

    const TE = window.google.translate.TranslateElement;
    new TE(
      {
        pageLanguage: "en",
        includedLanguages: LANGUAGES.map((l) => l.code).join(","),
        layout: TE.InlineLayout?.SIMPLE ?? 0,
        autoDisplay: false,
        multilanguagePage: true
      },
      "aetheris-gt-container"
    );
  } catch {
    // Widget init errors are non-fatal
  }
}

export function LanguageTranslator({ className = "" }: { className?: string }) {
  const [active, setActive] = useState("en");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Mount: read current language and load Google Translate
  useEffect(() => {
    const lang = getCurrentLang();
    setActive(lang);
    setMounted(true);

    // Load Google Translate widget (it will translate based on cookie)
    ensureGoogleTranslate();
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function selectLang(code: string) {
    setOpen(false);
    if (code === active) return;

    if (code === "en") {
      deleteAllGoogtrans();
    } else {
      setCookie("googtrans", `/en/${code}`, 365);
    }
    setActive(code);
    // Reload to let Google Translate pick up the new cookie
    setTimeout(() => window.location.reload(), 100);
  }

  const activeLang = mounted ? LANGUAGES.find((l) => l.code === active) ?? LANGUAGES[0] : LANGUAGES[0];
  const isTranslated = mounted && active !== "en";

  return (
    <div ref={wrapperRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="aetheris-btn-secondary relative inline-flex h-8 items-center gap-1.5 px-3 text-xs"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language — ${activeLang.label}`}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink">
          {activeLang.flag}
        </span>
        {isTranslated && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-edge bg-raised/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-edge px-3.5 py-2.5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Translate interface
              </div>
              <div className="text-xs text-muted">Powered by Google Translate</div>
            </div>
            <Globe className="h-4 w-4 text-accent" />
          </div>

          <ul role="listbox" className="max-h-72 overflow-y-auto py-1" aria-label="Language selector">
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === active;
              return (
                <li key={lang.code}>
                  <button
                    type="button"
                    onClick={() => selectLang(lang.code)}
                    role="option"
                    aria-selected={isActive}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left transition-colors hover:bg-accent/10"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-5 min-w-[2rem] items-center justify-center rounded px-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-edge ${isActive ? "bg-accent/20 text-accent" : "bg-surface text-muted"}`}>
                          {lang.flag}
                        </span>
                        <span className={`text-sm font-medium ${isActive ? "text-accent" : "text-ink"}`}>
                          {lang.native}
                        </span>
                      </div>
                      <div className="mt-0.5 pl-9 text-[11px] text-faint">{lang.label}</div>
                    </div>
                    {isActive && <Check className="h-4 w-4 flex-none text-accent" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-edge bg-surface/60 px-3.5 py-2.5 text-[10.5px] leading-4 text-faint">
            <span className="font-semibold text-warning">Note:</span> automatic translation may contain inaccuracies.
          </div>
        </div>
      )}

      {/* Hidden container for Google Translate widget */}
      <div id="aetheris-gt-container" style={{ position: "fixed", left: "-9999px", top: "-9999px", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }} />
    </div>
  );
}
