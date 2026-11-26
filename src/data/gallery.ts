import type { ResortImage } from "@/types/content";
import { photos } from "@/config/media";

// Preview keeps the nature/adventure/swimming composition; no duplicate URLs.
const featured = [photos.hero, photos.hangingBridge, photos.pool];
const ordered = [...featured, ...Object.values(photos).filter(photo => !featured.includes(photo))];
export const gallery: ResortImage[] = ordered.map(photo => ({
  id: photo.originalSrc,
  src: photo.src,
  originalSrc: photo.originalSrc,
  title: photo.title,
  alt: photo.alt,
  category: photo.category,
  approved: true,
  shape: photo.height > photo.width ? "portrait" : "wide",
}));
