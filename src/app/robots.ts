import type { MetadataRoute } from "next";
import { site } from "@/config/site";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      ...(site.allowIndexing
        ? {
            allow: "/",
            disallow: [
              "/admin/",
              "/api/",
              "/booking/confirmation/",
              "/booking/track/",
            ],
          }
        : { disallow: "/" }),
    },
    ...(site.url ? { sitemap: `${site.url}/sitemap.xml` } : {}),
  };
}
