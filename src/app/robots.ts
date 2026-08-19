import type { MetadataRoute } from "next";

/**
 * Crawler rules for the control plane.
 *
 * The public client portal and login are indexable; the admin control
 * plane and internal API surfaces are excluded from search engines.
 */
const APP_URL = process.env.AETHERIS_APP_URL ?? "https://app.aetheris.enterprise";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/_next/static/"]
      }
    ],
    host: APP_URL
  };
}
