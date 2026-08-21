import type { MetadataRoute } from "next";

const SITE_URL = "https://aetheris-panel.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/login", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/register", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/admin", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/admin/status", priority: 0.5, changeFrequency: "weekly" as const },
    { path: "/admin/nodes", priority: 0.5, changeFrequency: "weekly" as const },
    { path: "/admin/servers", priority: 0.5, changeFrequency: "weekly" as const },
    { path: "/admin/billing", priority: 0.5, changeFrequency: "weekly" as const },
    { path: "/admin/cron", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/admin/sftp", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/admin/whitelabel", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/admin/settings", priority: 0.4, changeFrequency: "monthly" as const }
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
