import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Aetheris - Control Plane",
    template: "%s | Aetheris"
  },
  description: "Enterprise billing and virtualization management control plane."
};

export const viewport: Viewport = {
  themeColor: "#09090B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-base font-sans text-ink">{children}</body>
    </html>
  );
}
