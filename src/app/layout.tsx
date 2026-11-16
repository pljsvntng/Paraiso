import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { site } from "@/config/site";
import "./globals.css";

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
  icons: { icon: "/branding/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
