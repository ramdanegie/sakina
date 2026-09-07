import type { MetadataRoute } from "next";
import { APP_URL } from "@/presentation/lib/app-meta";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal and utility screens. Nothing here is useful in results, and
      // /search in particular would generate endless thin query pages.
      disallow: ["/settings/", "/insights/", "/search/", "/credits/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
