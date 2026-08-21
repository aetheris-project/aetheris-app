"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const password = String(formData.get("password") ?? "");

    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Demo credential validation
    const isAdmin = email.startsWith("admin");
    const isUser = email.startsWith("user") || email.startsWith("client");

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    // In demo mode: any email/password works. Admin emails route to /admin.
    // Store the demo session in localStorage for the client-side layouts.
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "aetheris-demo-session",
        JSON.stringify({
          email,
          name: isAdmin ? "Admin User" : "Client User",
          role: isAdmin ? "admin" : "user",
          image: null,
          loginAt: new Date().toISOString()
        })
      );
    }

    // Route based on email prefix
    if (isAdmin) {
      window.location.href = "/admin";
    } else {
      window.location.href = "/";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
          {error}
        </div>
      )}

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
          placeholder="admin@aetheris.io or user@aetheris.io"
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
