"use client";

import { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { ResponsiveImage } from "@/components/responsive-image";
import { PhotoLightbox } from "@/components/shared/photo-lightbox";
import type { Photo } from "@/config/media";

export function AccommodationGallery({
  name,
  photos,
}: {
  name: string;
  photos: Photo[];
}) {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [active, setActive] = useState<number | null>(null);
  return (
    <>
      <div
        className={`accommodation-detail-gallery accommodation-collage-${Math.min(photos.length, 3)}`}
        aria-label={`${name} photographs`}
      >
        {photos.map((photo, index) => (
          <button
            key={photo.originalSrc}
            className="accommodation-photo"
            type="button"
            aria-haspopup="dialog"
            aria-label={`Open ${name} photograph ${index + 1} of ${photos.length}`}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setActive(index);
            }}
          >
            <ResponsiveImage
              src={photo.src}
              alt={photo.alt}
              fit="cover"
              priority={index === 0}
              sizes={
                photos.length === 1
                  ? "(max-width: 1050px) 100vw, 1280px"
                  : index === 0
                    ? "(max-width: 700px) calc(100vw - 40px), 64vw"
                    : photos.length === 2
                      ? "(max-width: 700px) calc(100vw - 40px), 32vw"
                      : "(max-width: 700px) 44vw, 32vw"
              }
            />
            <span className="accommodation-expand">
              <Maximize2 size={16} aria-hidden="true" />
              <span>{index === 0 ? "View photographs" : "Enlarge"}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="accommodation-gallery-note">
        {photos.length} {photos.length === 1 ? "photograph" : "photographs"} ·
        Select an image for a full-screen view.
      </p>
      <PhotoLightbox
        photos={photos}
        active={active}
        onActiveChange={setActive}
        onClose={() => {
          setActive(null);
          trigger.current?.focus({ preventScroll: true });
        }}
        label={`${name} photo viewer`}
        className="accommodation-lightbox"
        closeLabel="Close accommodation photographs"
        previousLabel="Previous accommodation photograph"
        nextLabel="Next accommodation photograph"
      />
    </>
  );
}
