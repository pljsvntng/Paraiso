export type MediaCategory =
  | "Nature"
  | "Adventures"
  | "Swimming"
  | "Accommodations"
  | "Dining"
  | "Camping & Glamping"
  | "Resort Facilities";
export interface ResortImage {
  id: string;
  src: string | null;
  originalSrc?: string;
  alt: string;
  title: string;
  category: MediaCategory;
  approved: boolean;
  shape: "wide" | "portrait" | "square";
}
export interface Adventure {
  slug: string;
  name: string;
  category: "On the trail" | "Up in the air" | "On the water";
  description: string;
  confirmed: boolean;
  image: string | null;
  /** Optional details confirmed by the resort; omit unknown fees and restrictions. */
  verified?: { requirements?: string[]; priceLabel?: string };
}
export interface Accommodation {
  slug: string;
  name: string;
  description: string;
  capacity: number | null;
  bedConfiguration: string | null;
  image: string | null;
  approved: boolean;
}
export interface ResortPackage {
  name: string;
  description: string;
  inclusions: string[];
  priceLabel: string | null;
  approved: boolean;
}
