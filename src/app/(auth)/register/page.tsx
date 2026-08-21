import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AetherisLogo } from "@/components/AetherisLogo";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Aetheris control panel account."
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-12">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] translate-x-1/4 translate-y-1/4 rounded-full bg-accent-strong/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Aetheris home">
            <AetherisLogo size={44} className="drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted">
            Get started with Aetheris in under a minute.
          </p>
        </div>

        <div className="aetheris-card p-8">
          <RegisterForm />
        </div>

        <div className="mt-6 text-center text-xs text-muted">
          <span>Already have an account? </span>
          <Link href="/login" className="font-medium text-accent transition-colors hover:text-accent-strong">
            Sign in
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-[11px] text-faint">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            <span>SSL encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span>Free to start</span>
          </div>
        </div>
      </div>
    </div>
  );
}
