import type { ReviewCardData } from "@/types/reviews";

export function filterReviews(
  items: readonly ReviewCardData[],
  rating: string,
  category: string,
  sort: string,
) {
  return items
    .filter(
      (item) =>
        (rating === "all" || item.rating === Number(rating)) &&
        (category === "all" || item.visitType === category),
    )
    .sort((a, b) => {
      const newest = (b.reviewDate || "").localeCompare(a.reviewDate || "");
      return sort === "highest" ? b.rating - a.rating || newest : newest;
    });
}

export function reviewExcerpt(message: string, limit = 260) {
  if (message.length <= limit) return null;
  const boundary = message.lastIndexOf(" ", limit);
  return message.slice(0, boundary > limit / 2 ? boundary : limit).trimEnd();
}
