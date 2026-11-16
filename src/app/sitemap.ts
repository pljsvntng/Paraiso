import type { MetadataRoute } from "next";
import { site } from "@/config/site";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!site.url) return [];
  return [
    "",
    "about",
    "accommodations",
    "adventures",
    "pool-cottages",
    "dining",
    "gallery",
    "packages",
    "contact",
    "faq",
  ].map((route) => ({
    url: `${site.url!.replace(/\/$/, "")}/${route ? route + "/" : ""}`,
    changeFrequency: "monthly",
    priority: route ? 0.7 : 1,
  }));
}
