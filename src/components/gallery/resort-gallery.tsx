"use client";
import { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { gallery } from "@/data/gallery";
import { Media } from "@/components/media";
import { PhotoLightbox } from "@/components/shared/photo-lightbox";

const seen = new Set<string>();
const published = gallery.filter((image) => {
  const key = image.originalSrc || image.src;
  if (!image.approved || !image.src || !key || seen.has(key)) return false;
  seen.add(key);
  return true;
});
const filters = [
  "All moments",
  ...new Set(published.map((image) => image.category)),
];
export function ResortGallery({ preview = false }: { preview?: boolean }) {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [filter, setFilter] = useState("All moments");
  const [active, setActive] = useState<number | null>(null);
  const [limit, setLimit] = useState(12);
  const selection = published.filter(
    (image) => filter === "All moments" || image.category === filter,
  );
  const visible = selection.slice(0, preview ? 3 : limit);
  const viewed = preview ? visible : selection;
  return (
    <div
      className={`container ${preview ? "gallery-preview" : ""}`}
      aria-label="Resort photo gallery"
    >
      {!preview && (
        <div
          className="gallery-filters"
          aria-label="Filter gallery by category"
        >
          {filters.map((category) => (
            <button
              type="button"
              key={category}
              aria-pressed={filter === category}
              onClick={() => {
                setFilter(category);
                setLimit(12);
              }}
            >
              {category}
            </button>
          ))}
        </div>
      )}
      <p className="gallery-note" role="status">
        {selection.length
          ? `${selection.length} ${selection.length === 1 ? "photograph" : "photographs"}. Select a photo for a closer look.`
          : "Our resort photo collection is coming soon."}
      </p>
      <div className="gallery-grid">
        {visible.map((image, index) => (
          <figure key={image.id} className={`gallery-item ${image.shape}`}>
            <button
              type="button"
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setActive(index);
              }}
              aria-haspopup="dialog"
              aria-label={`View ${image.title}`}
            >
              <Media
                src={image.src}
                alt={image.alt}
                label={image.title}
                natural={!preview}
                sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1050px) 45vw, 30vw"
              />
              <span className="sr-only">Open photograph</span>
            </button>
            <figcaption>
              <span>
                {image.category} · {image.title}
              </span>
              <Maximize2 size={13} aria-hidden="true" />
            </figcaption>
          </figure>
        ))}
      </div>
      {!preview && visible.length < selection.length && (
        <div className="gallery-more">
          <button
            className="button button-outline"
            type="button"
            onClick={() => setLimit((value) => value + 12)}
          >
            Show more photographs ({visible.length} of {selection.length})
          </button>
        </div>
      )}
      <PhotoLightbox
        photos={viewed.map((image) => ({ ...image, src: image.src! }))}
        active={active}
        onActiveChange={setActive}
        onClose={() => {
          setActive(null);
          trigger.current?.focus({ preventScroll: true });
        }}
        label="Resort photograph viewer"
      />
    </div>
  );
}
