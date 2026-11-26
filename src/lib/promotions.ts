import { getActivePromotions, type Promotion } from "@/data/promotions";
import { isCalendarDate, manilaDate } from "@/lib/dates";

/** Preserve published posters after expiry, without publishing drafts or disabled offers. */
export function getPastPromotions(
  items: readonly Promotion[],
  now = new Date(),
) {
  const today = manilaDate(now);
  return items
    .filter(
      (item) =>
        item.endDate &&
        isCalendarDate(item.endDate) &&
        item.endDate < today &&
        getActivePromotions([item], new Date(`${item.endDate}T12:00:00+08:00`))
          .length > 0,
    )
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
