"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    window.location.href = "/login";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="block text-[11px] font-medium uppercase tracking-wider text-faint">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            placeholder="Leonardo"
            className="aetheris-input h-11 px-4"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lastName" className="block text-[11px] font-medium uppercase tracking-wider text-faint">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            placeholder="Galli"
            className="aetheris-input h-11 px-4"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="reg-email" className="block text-[11px] font-medium uppercase tracking-wider text-faint">
          Email address
        </label>
        <input
          id="reg-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="aetheris-input h-11 px-4"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="reg-password" className="block text-[11px] font-medium uppercase tracking-wider text-faint">
          Password
        </label>
        <div className="relative">
          <input
            id="reg-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="Min 8 characters"
            className="aetheris-input h-11 px-4 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-muted"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex gap-1.5 mt-2">
          {["8+ chars", "uppercase", "number"].map((req) => (
            <span key={req} className="inline-flex h-5 items-center rounded-full border border-edge bg-raised/70 px-2 text-[10px] text-faint">
              {req}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <input
          id="terms"
          name="terms"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 rounded border-edge accent-[rgb(var(--aetheris-accent))]"
        />
        <label htmlFor="terms" className="text-xs text-muted leading-5">
          I agree to the{" "}
          <a href="#" className="font-medium text-accent hover:text-accent-strong">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="font-medium text-accent hover:text-accent-strong">Privacy Policy</a>
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
            Creating account...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Create account
          </>
        )}
      </button>
    </form>
  );
}
