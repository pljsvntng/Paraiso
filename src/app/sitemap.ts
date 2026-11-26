import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { accommodations } from "@/data/accommodations";
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
    "guest-reviews",
    "packages",
    "contact",
    "booking",
    "faq",
    "policies/privacy",
    "policies/terms",
    "policies/cancellation",
    "policies/rescheduling",
    ...accommodations.map((stay) => `accommodations/${stay.slug}`),
  ].map((route) => ({
    url: `${site.url!.replace(/\/$/, "")}/${route ? route + "/" : ""}`,
    changeFrequency: "monthly",
    priority: route ? 0.7 : 1,
  }));
}
