"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // Simulate login delay for demo
    await new Promise((resolve) => setTimeout(resolve, 1200));
    // In production this would call the auth API
    window.location.href = "/";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-[11px] font-medium uppercase tracking-wider text-faint"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="aetheris-input h-11 px-4"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-[11px] font-medium uppercase tracking-wider text-faint"
          >
            Password
          </label>
          <a
            href="#"
            className="text-[11px] font-medium text-accent transition-colors hover:text-accent-strong"
          >
            Forgot password?
          </a>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            className="aetheris-input h-11 px-4 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-muted"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="remember"
          name="remember"
          type="checkbox"
          className="h-4 w-4 rounded border-edge accent-[rgb(var(--aetheris-accent))]"
        />
        <label htmlFor="remember" className="text-xs text-muted">
          Remember this device for 30 days
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="aetheris-btn-primary h-11 w-full text-[15px]"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Signing in...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </>
        )}
      </button>
    </form>
  );
}
