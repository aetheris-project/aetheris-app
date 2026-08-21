import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AetherisLogo } from "@/components/AetherisLogo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Aetheris control panel."
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-12">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] translate-x-1/4 translate-y-1/4 rounded-full bg-accent-strong/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Aetheris home">
            <AetherisLogo size={44} className="drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to access your servers, billing and management control panel.
          </p>
        </div>

        {/* Demo credentials banner */}
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent-soft p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
            Demo mode - use any credentials below
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg border border-edge bg-base/60 p-2">
              <div className="font-medium text-ink">Admin account</div>
              <div className="mt-0.5 font-mono text-faint">admin@aetheris.io / admin</div>
            </div>
            <div className="rounded-lg border border-edge bg-base/60 p-2">
              <div className="font-medium text-ink">Client account</div>
              <div className="mt-0.5 font-mono text-faint">user@aetheris.io / user</div>
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="aetheris-card p-8">
          {/* Social login buttons */}
          <div className="space-y-3">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-edge bg-raised/60 text-sm font-medium text-ink transition-all duration-200 hover:border-[#4285F4]/40 hover:bg-raised hover:shadow-[0_0_20px_-6px_color-mix(in_srgb,rgb(66,133,244)_40%,transparent)]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-edge bg-raised/60 text-sm font-medium text-ink transition-all duration-200 hover:border-white/30 hover:bg-raised hover:shadow-[0_0_20px_-6px_rgba(255,255,255,0.2)]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continue with Apple
            </button>

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-edge bg-raised/60 text-sm font-medium text-ink transition-all duration-200 hover:border-[#5865F2]/40 hover:bg-raised hover:shadow-[0_0_20px_-6px_color-mix(in_srgb,rgb(88,101,242)_40%,transparent)]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Continue with Discord
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-edge" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface/80 px-3 text-faint">or sign in with email</span>
            </div>
          </div>

          {/* Email/password form */}
          <LoginForm />
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center text-xs text-muted">
          <span>No account yet? </span>
          <Link href="/register" className="font-medium text-accent transition-colors hover:text-accent-strong">
            Create one
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[11px] text-faint">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            <span>SSL encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span>99.99% uptime</span>
          </div>
          <a href="https://discord.gg/6GcfebuT2A" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-ink">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Join Discord</span>
          </a>
        </div>
      </div>
    </div>
  );
}
