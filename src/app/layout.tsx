import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MotionExperience } from "@/components/motion-experience";
import { site } from "@/config/site";
import { resortLogoOnLight } from "@/config/branding";
import { DemoNotice } from "@/components/booking/demo-notice";
import "./globals.css";
import "./interactive.css";

export const metadata: Metadata = {
  title: {
    default: `${site.name} | A Little Nature. A Lot of Adventure.`,
    template: `%s | ${site.shortName}`,
  },
  description: site.description,
  ...(site.url ? { metadataBase: new URL(site.url) } : {}),
  robots: { index: site.allowIndexing, follow: site.allowIndexing },
  openGraph: {
    title: site.name,
    description: site.description,
    type: "website",
    locale: "en_PH",
    siteName: site.name,
  },
  icons: {
    icon: { url: resortLogoOnLight.src, type: "image/svg+xml", sizes: "any" },
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/manrope-regular-2.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/fraunces-regular-1.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/fraunces-italic-0.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <MotionExperience />
        <main id="main" tabIndex={-1}>
          <DemoNotice />
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
