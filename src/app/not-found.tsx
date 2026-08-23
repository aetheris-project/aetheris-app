"use client";

import Link from "next/link";
import { ArrowLeft, Home, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <div className="relative">
        <div className="absolute -inset-x-20 -top-20 h-60 glow-accent opacity-30" aria-hidden="true" />
        <ShieldAlert className="relative h-16 w-16 text-accent/40" />
      </div>

      <span className="mt-6 text-[80px] font-extrabold leading-none tracking-tighter text-ink/10">
        404
      </span>

      <h1 className="mt-2 text-xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">
        This route does not exist in the Aetheris control panel.
        Return to the dashboard or go back to the previous page.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/admin" className="aetheris-btn-primary h-10 px-5">
          <Home className="h-4 w-4" aria-hidden="true" />
          Admin dashboard
        </Link>
        <Link href="/login" className="aetheris-btn-secondary h-10 px-5">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Login
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="aetheris-btn-ghost h-10 px-5"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Go back
        </button>
      </div>
    </div>
  );
}
