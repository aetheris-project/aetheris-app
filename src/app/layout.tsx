import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const SITE_URL = "https://aetheris-panel.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aetheris - Billing and Virtualization Control Panel",
    template: "%s | Aetheris"
  },
  description:
    "Enterprise billing and virtualization management platform. Converges WHMCS, FOSSBilling, Pterodactyl Panel, Proxmox VE and VirtFusion into a single control panel.",
  keywords: [
    "billing platform",
    "virtualization management",
    "pterodactyl panel",
    "proxmox ve",
    "whmcs alternative",
    "game server hosting",
    "VPS management",
    "control panel"
  ],
  authors: [{ name: "Leonardo Galli", url: "https://github.com/Leo-Galli" }],
  creator: "Leonardo Galli",
  publisher: "Aetheris Project",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
    other: {
      rel: "icon",
      type: "image/svg+xml",
      url: "/icon.svg"
    }
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Aetheris",
    title: "Aetheris - Billing and Virtualization Control Panel",
    description:
      "Enterprise billing and virtualization management platform. Converges WHMCS, FOSSBilling, Pterodactyl, Proxmox VE and VirtFusion into a single control panel.",
    url: SITE_URL,
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "Aetheris Control Panel"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Aetheris - Billing and Virtualization Control Panel",
    description:
      "Enterprise billing and virtualization management platform. Converges WHMCS, FOSSBilling, Pterodactyl, Proxmox VE and VirtFusion into a single control panel.",
    images: ["/logo.svg"],
    creator: "@aetheris"
  },
  alternates: {
    canonical: SITE_URL
  },
  verification: {}
};

export const viewport: Viewport = {
  themeColor: "#09090B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Aetheris",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  description:
    "Enterprise billing and virtualization management platform",
  email: "hello@another-horizon.eu",
  sameAs: [
    "https://github.com/aetheris-project",
    "https://x.com/aetheris"
  ]
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aetheris",
  operatingSystem: "Linux, macOS, Windows, Web",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Billing and Infrastructure Management",
  description:
    "Enterprise billing and virtualization management platform. Converges WHMCS, FOSSBilling, Pterodactyl Panel, Proxmox VE and VirtFusion into a single control panel.",
  url: SITE_URL,
  image: `${SITE_URL}/logo.svg`,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD"
  },
  featureList: [
    "Unified billing engine with Stripe, PayPal and Mollie",
    "Pterodactyl Application and Client API driver",
    "Proxmox VE and VirtFusion hypervisor drivers",
    "Client VNC console",
    "Dynamic whitelabeling without rebuilds",
    "Admin panel with node management and provisioning"
  ],
  license: "https://github.com/aetheris-project/aetheris-app/blob/main/LICENSE"
};

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Aetheris Platform",
  description:
    "Enterprise billing and virtualization management platform for the enterprise",
  brand: { "@type": "Brand", name: "Aetheris" },
  category: "Billing and Virtualization Management Software",
  offers: {
    "@type": "Offer",
    url: SITE_URL,
    priceCurrency: "USD",
    price: "0",
    availability: "https://schema.org/InStock"
  }
};

function JsonLdScript({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen bg-base font-sans text-ink`}>
        {children}
        <JsonLdScript data={organizationJsonLd} />
        <JsonLdScript data={softwareJsonLd} />
        <JsonLdScript data={productJsonLd} />
      </body>
    </html>
  );
}
