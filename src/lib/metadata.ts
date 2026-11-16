import type { Metadata } from "next";
import { site } from "@/config/site";
export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const url = site.url ? `${site.url.replace(/\/$/, "")}${path}` : undefined;
  return {
    title,
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      title: `${title} | ${site.shortName}`,
      description,
      type: "website",
      locale: "en_PH",
      ...(url ? { url } : {}),
    },
  };
}
