import catalog from "@/data/photo-catalog.json";
import accommodationCatalog from "@/data/accommodation-photo-catalog.json";
import variants from "@/data/image-variants.json";
import type { MediaCategory } from "@/types/content";

export type Photo = {
  src: string;
  originalSrc: string;
  srcSet?: string;
  mobile?: { src: string; srcSet: string; width: number; height: number };
  width: number;
  height: number;
  title: string;
  alt: string;
  category: MediaCategory;
  position: string;
  fit?: "cover" | "contain";
};
export type PhotoKey = keyof typeof catalog;
export type AccommodationPhotoKey = keyof typeof accommodationCatalog;

// One visually reviewed catalog drives every page and the gallery. Uploads stay put.
export const photos = Object.fromEntries(
  Object.entries(catalog).map(([id, entry]) => [
    id,
    {
      ...entry,
      ...variants[entry.src as keyof typeof variants],
      originalSrc: entry.src,
    },
  ]),
) as Record<PhotoKey, Photo>;

// Room uploads are separate so adding them never changes the main Gallery page.
export const accommodationPhotos = Object.fromEntries(
  Object.entries(accommodationCatalog).map(([id, entry]) => [
    id,
    {
      ...entry,
      ...variants[entry.src as keyof typeof variants],
      originalSrc: entry.src,
    },
  ]),
) as Record<AccommodationPhotoKey, Photo>;

export const resortMedia = {
  hero: photos.hero,
  nature: photos.nature,
  skywalk: photos.skywalk,
  trail: photos.trail,
  pool: photos.pool,
  stay: photos.stay,
  dining: photos.dining,
  facilities: photos.pavilion,
};
export type ResortMediaKey = keyof typeof resortMedia;

export function getPhoto(src?: string | null): Photo | undefined {
  return [...Object.values(photos), ...Object.values(accommodationPhotos)].find(
    (photo) => photo.src === src || photo.originalSrc === src,
  );
}
