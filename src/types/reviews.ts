export const visitTypes = [
  "Family Vacation",
  "Staycation",
  "Day Tour",
  "Special Occasion",
  "Group Outing",
  "Resort Experience",
] as const;
export type VisitType = (typeof visitTypes)[number];

/** Genuine, permission-cleared public content only. Never add email or booking details. */
export type GuestReview = {
  id: string;
  guestName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  message: string;
  reviewDate?: string; // Optional original review date: YYYY-MM-DD.
  visitType?: VisitType;
  source: "Google Maps";
  originalReviewUrl?: string;
  approved: boolean;
};

export type ReviewCardData = Omit<GuestReview, "approved">;
