export type MediaCategory =
  | "Nature"
  | "Adventures"
  | "Swimming"
  | "Accommodations"
  | "Dining";
export interface ResortImage {
  id: string;
  src: string | null;
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
