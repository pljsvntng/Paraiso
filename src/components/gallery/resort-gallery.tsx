"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, X, Maximize2 } from "lucide-react";
import { gallery } from "@/data/gallery";
import { Media } from "@/components/media";
import type { MediaCategory, ResortImage } from "@/types/content";

const filters: ("All moments" | MediaCategory)[] = [
  "All moments",
  "Nature",
  "Adventures",
  "Swimming",
  "Accommodations",
  "Dining",
];

export function ResortGallery() {
  const [filter, setFilter] = useState<string>("All moments");
  const [active, setActive] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = gallery.filter(
    (image) => filter === "All moments" || image.category === filter,
  );
  const approved = visible.filter((image) => image.approved && image.src);
  const index = approved.findIndex((image) => image.id === active);
  const current = approved[index];

  function open(image: ResortImage) {
    setActive(image.id);
    dialog.current?.showModal();
  }
  function step(direction: number) {
    if (approved.length < 2) return;
    setActive(
      approved[(index + direction + approved.length) % approved.length].id,
    );
  }
  function reset() {
    setActive(null);
  }

  return (
    <section className="container" aria-label="Resort photo gallery">
      <div className="gallery-filters" aria-label="Filter gallery by category">
        {filters.map((category) => (
          <button
            key={category}
            aria-pressed={filter === category}
            onClick={() => setFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>
      <p className="gallery-note" role="status">
        {approved.length
          ? `${approved.length} approved ${approved.length === 1 ? "photograph" : "photographs"} in this selection. Select a photograph to open the viewer.`
          : "Our photo album is being prepared. These labeled layout placeholders will be replaced with approved resort photographs."}
      </p>
      <div className="gallery-grid">
        {visible.map((image) => (
          <figure key={image.id} className={`gallery-item ${image.shape}`}>
            {image.approved && image.src ? (
              <button
                onClick={() => open(image)}
                aria-label={`View ${image.title}`}
              >
                <Media src={image.src} alt={image.alt} label={image.title} />
                <span className="sr-only">Open photograph</span>
              </button>
            ) : (
              <Media
                label={image.title}
                alt={image.alt}
                className={
                  image.category === "Swimming"
                    ? "media-lagoon"
                    : image.category === "Accommodations"
                      ? "media-warm"
                      : image.category === "Dining"
                        ? "media-clay"
                        : ""
                }
              />
            )}
            <figcaption>
              <span>{image.category}</span>
              {image.approved && image.src ? (
                <Maximize2 size={13} aria-hidden="true" />
              ) : (
                <small>Approved photograph to follow</small>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label="Resort photograph viewer"
        onClose={reset}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            step(1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            step(-1);
          }
        }}
      >
        <div className="lightbox-top">
          <span>
            {current?.category} · {index + 1} / {approved.length}
          </span>
          <button
            className="icon-button"
            aria-label="Close photograph viewer"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        {current?.src && (
          <div className="lightbox-stage">
            <Image
              src={current.src}
              alt={current.alt}
              fill
              sizes="(max-width: 700px) 100vw, 1100px"
            />
          </div>
        )}
        <div className="lightbox-controls">
          <p aria-live="polite">{current?.title}</p>
          <div>
            <button
              className="icon-button"
              disabled={approved.length < 2}
              aria-label="Previous photograph"
              onClick={() => step(-1)}
            >
              <ArrowLeft size={19} />
            </button>
            <button
              className="icon-button"
              disabled={approved.length < 2}
              aria-label="Next photograph"
              onClick={() => step(1)}
            >
              <ArrowRight size={19} />
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
