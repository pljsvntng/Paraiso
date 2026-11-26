import { getGoogleReviewUrl } from "@/config/google-reviews";
import {
  visitTypes,
  type GuestReview,
  type ReviewCardData,
  type VisitType,
} from "@/types/reviews";

// Genuine Google reviews only, with permission and attribution. No sample reviews.
// Add entries here, mark approved: true, then rebuild/redeploy. See docs/GUEST_REVIEWS.md.
export const guestReviews: GuestReview[] = [
  {
    id: "review-001",
    guestName: "Narra Ellise",
    message: "Had a wonderful experience at Paraiso de June Quixote Ecofarm Resort! The place is beautiful, peaceful, and surrounded by nature, making it perfect for relaxation, team-building activities, and family gatherings. The facilities are great, the surroundings are well-maintained, and the staff are warm and accommodating. A perfect place to unwind, enjoy nature, and create memorable experiences. Highly recommended! Definitely worth visiting again! 🌿❤️",
    rating: 5,
    reviewDate: "2026-11-13",
    source: "Google Maps",
    originalReviewUrl: "https://maps.app.goo.gl/Y8MWUe4wzbfsYN3a9",
    approved: true,
  },

  {
    id: "review-002",
    guestName: "Shyra Faith",
    message: "It was such a nice experience! We were a group of 16 and had to make a down payment, but they were very easy to talk to beforehand and everything went smoothly. The staff were amazing, very kind, accommodating, and easy to communicate with. We tried all the activities and had so much fun, but the things we really loved were the ATV and the Superman Zipline, which were definitely the best! My cousins really enjoyed it and we would absolutely love to come back again someday. Highly recommended!",
    rating: 5,
    reviewDate: "2026-09-20",
    source: "Google Maps",
    originalReviewUrl: "https://maps.app.goo.gl/VPSzzDCj97ufiUeN9",
    approved: true,
  },

  {
  id: "review-003",
  guestName: "Alyzza Mae Robledo",
  message: `We visited Paraiso de Jun Quixote in Naic, and it was one of the nicest places we've explored in Cavite. The entrance fee offers great value for money—at around ₱1,000, you can enjoy the different attractions around the property, and it even includes a samgyupsal meal, which made the experience even more worthwhile. One thing that really stood out was the staff.
  Everyone we met was warm, approachable, and genuinely helpful, which made us feel welcome throughout our visit. They were always happy to answer questions and assist guests with a smile.
  The resort also has spacious parking, so arriving by car was very convenient. We also enjoyed riding their unique jeepney cable ride, which added a fun and memorable touch to the trip. If you're looking for a place to explore in Cavite with family or friends, I'd definitely recommend Paraiso de Jun Quixote. It's a fun day trip with plenty to see and experience.`,
rating: 5,
reviewDate: "2026-07-20",
source: "Google Maps",
originalReviewUrl: "https://maps.app.goo.gl/jBKVEKZXnwE7fYa36",
approved: true,
},
];

export function getApprovedReviews(
  items: readonly unknown[] = guestReviews,
): ReviewCardData[] {
  if (!Array.isArray(items)) return [];
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const reviews: ReviewCardData[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    if (item.approved !== true || item.source !== "Google Maps") continue;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const guestName =
      typeof item.guestName === "string" ? item.guestName.trim() : "";
    const message = typeof item.message === "string" ? item.message.trim() : "";
    const rating = item.rating;
    if (
      !id ||
      !guestName ||
      guestName.length > 80 ||
      !message ||
      message.length > 6000 ||
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    )
      continue;
    const fingerprint = `${guestName.toLowerCase()}|${message.toLowerCase().replace(/\s+/g, " ")}`;
    if (seenIds.has(id) || seenContent.has(fingerprint)) continue;
    seenIds.add(id);
    seenContent.add(fingerprint);
    let reviewDate: string | undefined;
    if (
      typeof item.reviewDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.reviewDate)
    ) {
      const date = new Date(`${item.reviewDate}T00:00:00Z`);
      if (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === item.reviewDate
      )
        reviewDate = item.reviewDate;
    }
    // Explicit projection: private or unexpected fields never reach public cards.
    reviews.push({
      id,
      guestName,
      message,
      rating: rating as ReviewCardData["rating"],
      reviewDate,
      visitType: visitTypes.includes(item.visitType as VisitType)
        ? (item.visitType as VisitType)
        : undefined,
      source: "Google Maps",
      originalReviewUrl: getGoogleReviewUrl(item.originalReviewUrl),
    });
  }
  return reviews.sort((a, b) =>
    (b.reviewDate || "").localeCompare(a.reviewDate || ""),
  );
}
