"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", flag: "EN", native: "English" },
  { code: "it", label: "Italian", flag: "IT", native: "Italiano" },
  { code: "es", label: "Spanish", flag: "ES", native: "Español" },
  { code: "fr", label: "French", flag: "FR", native: "Français" },
  { code: "de", label: "German", flag: "DE", native: "Deutsch" },
  { code: "pt", label: "Portuguese", flag: "PT", native: "Português" },
  { code: "nl", label: "Dutch", flag: "NL", native: "Nederlands" },
  { code: "pl", label: "Polish", flag: "PL", native: "Polski" },
  { code: "ru", label: "Russian", flag: "RU", native: "Русский" },
  { code: "ja", label: "Japanese", flag: "JA", native: "日本語" },
  { code: "zh-CN", label: "Chinese (Simplified)", flag: "ZH", native: "中文（简体）" },
  { code: "ko", label: "Korean", flag: "KO", native: "한국어" },
];

const INCLUDED_LANGS = LANGUAGES.map((l) => l.code).join(",");

function getLangFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/googtrans=\/en\/([a-zA-Z-]+)/i);
  if (!m) return null;
  const captured = m[1] ?? "en";
  const raw = captured.toLowerCase();
  return LANGUAGES.some((l) => l.code.toLowerCase() === raw) ? captured : "en";
}

function writeLangCookie(code: string) {
  if (typeof document === "undefined") return;
  const value = code === "en" ? "" : `/en/${code}`;
  const base = `googtrans=${value}; path=/; SameSite=Lax; max-age=31536000`;
  document.cookie = base;
  try {
    const host = window.location.hostname;
    if (host) document.cookie = `${base}; domain=.${host}`;
    if (host.endsWith(".vercel.app")) document.cookie = `${base}; domain=.vercel.app`;
  } catch {
    /* ignore */
  }
}

function clearAllCookies() {
  if (typeof document === "undefined") return;
  const hosts = [""];
  try {
    const h = window.location.hostname;
    if (h) hosts.push(`.${h}`);
    if (h && h.endsWith(".vercel.app")) hosts.push(".vercel.app");
  } catch {
    /* ignore */
  }
  for (const domain of hosts) {
    for (const path of ["/", ""]) {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

declare global {
  interface Window {
    google: unknown;
    googleTranslateElementInit?: () => void;
  }
}

export function LanguageTranslator({ className = "" }: { className?: string }) {
  const [active, setActive] = useState<string>(() => getLangFromCookie() ?? "en");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    if (typeof window === "undefined") return;
    inited.current = true;

    const inject = () => {
      window.googleTranslateElementInit = () => {
        try {
          const gw = window as {
            google: {
              translate: {
                TranslateElement: new (
                  opts: unknown,
                  id: string
                ) => void;
              } & Record<string, unknown>;
            };
          };
          const Te = (gw.google.translate as Record<string, unknown>).TranslateElement as
            | (new (opts: unknown, id: string) => void) & {
                InlineLayout?: { SIMPLE: unknown };
              }
            | undefined;
          if (!Te) return;
          const layoutVal = (Te.InlineLayout?.SIMPLE as number | undefined) ?? 0;
          new Te(
            {
              pageLanguage: "en",
              includedLanguages: INCLUDED_LANGS,
              layout: layoutVal,
              autoDisplay: false,
              multilanguagePage: true,
            },
            "aetheris-google-translate-element"
          );
        } catch {
          /* ignore init failures */
        }
      };

      if (document.getElementById("aetheris-gt-script")) return;
      const s = document.createElement("script");
      s.id = "aetheris-gt-script";
      s.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      s.defer = true;
      s.onerror = () => {
        /* network blocked; component silently degrades */
      };
      document.head.appendChild(s);
    };

    const mountStyle = () => {
      if (document.getElementById("aetheris-gt-style")) return;
      const style = document.createElement("style");
      style.id = "aetheris-gt-style";
      style.textContent = `
        #aetheris-google-translate-element { display:none !important; position: fixed !important; left:-9999px !important; top:-9999px !important; width:0; height:0; overflow:hidden; pointer-events:none; }
        .goog-te-banner-frame { display:none !important; }
        body { top:0 !important; }
        .goog-te-balloon-frame { display:none !important; }
        font[class^="goog-te"] { background:transparent !important; }
      `;
      document.head.appendChild(style);
    };

    if (!document.getElementById("aetheris-google-translate-element")) {
      const el = document.createElement("div");
      el.id = "aetheris-google-translate-element";
      document.body.appendChild(el);
    }
    mountStyle();
    inject();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSelect = (code: string) => {
    setActive(code);
    setOpen(false);
    clearAllCookies();
    if (code !== "en") writeLangCookie(code);
    setTimeout(() => {
      try {
        const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (combo) {
          combo.value = code;
          combo.dispatchEvent(new Event("change"));
        } else if (code !== "en") {
          // Widget combo not ready yet — let cookie drive the next reload.
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    }, code === "en" ? 0 : 120);
    if (code === "en") setTimeout(() => window.location.reload(), 60);
  };

  const activeLang = LANGUAGES.find((l) => l.code.toLowerCase() === active.toLowerCase());
  const isTranslated = active.toLowerCase() !== "en";

  return (
    <div ref={wrapperRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="aetheris-btn-secondary relative inline-flex h-8 items-center gap-1.5 px-3 text-xs"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language — ${activeLang?.label ?? "English"}`}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink">
          {activeLang?.flag ?? "EN"}
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

          <ul
            role="listbox"
            className="scrollbar-thin max-h-72 overflow-y-auto py-1"
            aria-label="Language selector"
          >
            {LANGUAGES.map((lang) => {
              const isActive = lang.code.toLowerCase() === active.toLowerCase();
              return (
                <li key={lang.code}>
                  <button
                    type="button"
                    onClick={() => doSelect(lang.code)}
                    role="option"
                    aria-selected={isActive}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left transition-colors hover:bg-accent/10"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 min-w-[2rem] items-center justify-center rounded bg-surface px-1 text-[10px] font-bold uppercase tracking-wider text-muted ring-1 ring-edge">
                          {lang.flag}
                        </span>
                        <span className={`text-sm font-medium ${isActive ? "text-accent" : "text-ink"}`}>
                          {lang.native}
                        </span>
                      </div>
                      <div className="mt-0.5 pl-9 text-[11px] text-faint">{lang.label}</div>
                    </div>
                    {isActive ? (
                      <Check className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-edge bg-surface/60 px-3.5 py-2.5 text-[10.5px] leading-4 text-faint">
            <span className="font-semibold text-warning">Note:</span> automatic translation may
            contain inaccuracies. Refer to the English UI for precise technical wording.
          </div>
        </div>
      )}
    </div>
  );
}
