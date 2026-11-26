import { isCalendarDate, manilaDate } from "@/lib/dates";
export type Promotion = {
  id: string;
  title: string;
  description: string;
  image: `/images/promotions/${string}`;
  imageAlt?: string;
  /** Optional longer copy shown in the poster preview. */
  details?: string;
  /** ISO dates must be verified. End dates are inclusive in Asia/Manila. */
  startDate?: string;
  endDate?: string;
  status?: "draft" | "published" | "archived";
  featured?: boolean;
  verifiedPrice?: string;
  promotionalDate?: string;
  validityPeriod?: string;
  category?: string;
  ctaLabel?: string;
  ctaLink?: string;
  active: boolean;
  /** Lower numbers appear first. Equal values retain file order. */
  displayOrder: number;
};

// Add only approved content with a matching uploaded poster.
// See docs/HOW_TO_ADD_PROMOTIONS.md. An empty list shows the homepage empty state.
export const promotions: Promotion[] = [
  {
    id: "summer-promo",
    title: "Rainy Season Adventure Staycation",
    description: "Explore the staycation poster and ask the resort about current dates, inclusions, and availability.",
    image: "/images/promotions/promotion.png",
    imageAlt: "Rainy season adventure staycation promotion poster with package information",
    // Dates transcribed from the supplied poster, not guessed from the title.
    startDate: "2026-06-26",
    endDate: "2026-07-11",
    active: true,
    displayOrder: 1,
  },
   {
    id: "fathersday-promo",
    title: "Father's Day Special",
    description: "View the Father's Day staycation poster. Confirm the applicable dates and current offers directly with the resort.",
    image: "/images/promotions/promotion-2.png",
    imageAlt: "Father's Day staycation poster with two-day, one-night package information",
    startDate: "2026-06-12",
    endDate: "2026-06-21",
    active: true,
    displayOrder: 2,
  },
  {
    id: "adventure-promo",
    title: "All in One Adventure",
    description: "Explore the activities pictured on the adventure poster and ask the resort about current packages.",
    image: "/images/promotions/promotion-3.png",
    imageAlt: "All-in adventure, pool, and dining promotion poster with pictured activities",
    startDate: "2026-05-20",
    endDate: "2026-05-31",
    active: true,
    displayOrder: 2,
  },
];

export function getActivePromotions(items: readonly Promotion[] = promotions, now = new Date()) {
  const today = manilaDate(now);
  return items
    .filter(item => item.active && (!item.status || item.status === "published")
      && (!item.startDate || isCalendarDate(item.startDate) && item.startDate <= today)
      && (!item.endDate || isCalendarDate(item.endDate) && item.endDate >= today)
      && !(item.startDate && item.endDate && item.startDate > item.endDate))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Keep optional manual links usable without allowing script or protocol-relative URLs. */
export function getPromotionLink(value?: string): string | undefined {
  const href = value?.trim();
  if (!href || /[\s\\]/.test(href)) return undefined;
  if (/^\/(?!\/)/.test(href)) return href;
  try {
    const url = new URL(href);
    if (["https:", "mailto:", "tel:"].includes(url.protocol)) return url.href;
  } catch {
    // Missing or invalid links fall back to the poster preview.
  }
  return undefined;
}
