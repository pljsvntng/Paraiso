"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api/reservations";
import {
  getBookingLink,
  getInquiryPath,
  type BookingIntent,
} from "@/config/booking";

type Product = {
  name: string;
  slug: string;
  category: string;
  active: boolean;
};
const CatalogContext = createContext<Product[]>([]);

// One shared request; photos and editorial content remain server rendered.
export function FeaturedBookingProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      void api<{ products: Product[] }>("commerce/catalog", undefined, "GET", {
        signal: controller.signal,
      })
        .then((catalog) => {
          if (!controller.signal.aborted) setProducts(catalog.products);
        })
        .catch(() => {
          /* Availability inquiries remain usable if the catalog is offline. */
        });
    };
    const section = document.getElementById("featured-experiences");
    let observer: IntersectionObserver | undefined;
    if (section && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          load();
        },
        { rootMargin: "400px 0px" },
      );
      observer.observe(section);
    } else load();
    return () => {
      observer?.disconnect();
      controller.abort();
    };
  }, []);
  return (
    <CatalogContext.Provider value={products}>
      {children}
    </CatalogContext.Provider>
  );
}

export function FeaturedBookingAction({
  name,
  intent,
  category,
  names,
  slugs,
}: {
  name: string;
  intent: BookingIntent;
  category: string;
  names: string[];
  slugs: string[];
}) {
  const products = useContext(CatalogContext);
  const product = products.find(
    (item) =>
      item.active &&
      item.category === category &&
      (names.some(
        (candidate) => candidate.toLowerCase() === item.name.toLowerCase(),
      ) ||
        slugs.includes(item.slug)),
  );
  return (
    <Link
      className="text-link featured-booking-link"
      href={
        product
          ? getBookingLink(intent, product.name).href
          : getInquiryPath(intent, name)
      }
      aria-label={
        product ? `Reserve Now — ${name}` : `Ask about availability — ${name}`
      }
    >
      {product ? "Reserve Now" : "Ask about availability"}
      <ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  );
}
