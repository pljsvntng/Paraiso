"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { ResponsiveImage } from "@/components/responsive-image";

export type ViewerPhoto = {
  src: string;
  originalSrc?: string;
  alt: string;
  title?: string;
  category?: string;
};
export function PhotoLightbox({
  photos,
  active,
  onActiveChange,
  onClose,
  label,
  className = "",
  closeLabel = "Close photograph viewer",
  previousLabel = "Previous photograph",
  nextLabel = "Next photograph",
}: {
  photos: ViewerPhoto[];
  active: number | null;
  onActiveChange: (index: number) => void;
  onClose: () => void;
  label: string;
  className?: string;
  closeLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const caption = useId();
  const current = active === null ? undefined : photos[active];
  const open = !!current;
  const source = current?.originalSrc || current?.src;
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const zoomed = !!source && zoomedPhoto === source;
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  useEffect(() => {
    stage.current?.scrollTo(0, 0);
  }, [active, zoomed]);
  useEffect(() => {
    if (open)
      thumbnails.current
        ?.querySelector<HTMLElement>('[aria-pressed="true"]')
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active, open]);
  function select(index: number) {
    setZoomedPhoto(null);
    onActiveChange(index);
  }
  function step(direction: number) {
    if (photos.length > 1)
      select(((active ?? 0) + direction + photos.length) % photos.length);
  }
  return (
    <dialog
      ref={dialog}
      className={`lightbox photo-lightbox ${className}`}
      aria-label={label}
      aria-describedby={caption}
      onClose={() => {
        setZoomedPhoto(null);
        onClose();
      }}
      onKeyDown={(event) => {
        if (
          zoomed &&
          event.target === stage.current &&
          ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
        )
          return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          step(event.key === "ArrowRight" ? 1 : -1);
        }
        if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          select(event.key === "Home" ? 0 : photos.length - 1);
        }
        if (event.key === "Tab") {
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href], [tabindex='0']",
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="lightbox-top">
        <span>
          {current?.category || label} · {(active ?? 0) + 1} / {photos.length}
        </span>
        <div className="lightbox-top-actions">
          <button
            className="icon-button"
            type="button"
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
            aria-pressed={zoomed}
            onClick={() => setZoomedPhoto(zoomed ? null : source || null)}
          >
            {zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
          </button>
          <button
            className="icon-button"
            type="button"
            autoFocus
            aria-label={closeLabel}
            onClick={() => dialog.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
      </div>
      <div
        ref={stage}
        className={`lightbox-stage${zoomed ? " is-zoomed" : ""}`}
        tabIndex={zoomed ? 0 : undefined}
        aria-label={
          zoomed ? "Zoomed photograph. Scroll to explore." : undefined
        }
        onTouchStart={(event) => {
          touch.current =
            !zoomed && event.touches.length === 1
              ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
              : null;
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onTouchEnd={(event) => {
          if (touch.current) {
            const x = event.changedTouches[0].clientX - touch.current.x,
              y = event.changedTouches[0].clientY - touch.current.y;
            if (Math.abs(x) > 50 && Math.abs(x) > Math.abs(y))
              step(x < 0 ? 1 : -1);
          }
          touch.current = null;
        }}
      >
        {current && source && (
          <div className="lightbox-photo-layer" key={source}>
            <ResponsiveImage
              src={source}
              original
              alt={current.alt}
              fit="contain"
              priority
              sizes="100vw"
            />
          </div>
        )}
      </div>
      <div className="lightbox-controls">
        <p id={caption} aria-live="polite">
          {current?.title || current?.alt}
          {source && (
            <a
              className="lightbox-original"
              href={source}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original photograph
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </p>
        <div>
          <button
            type="button"
            className="icon-button"
            disabled={photos.length < 2}
            aria-label={previousLabel}
            onClick={() => step(-1)}
          >
            <ArrowLeft size={19} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={photos.length < 2}
            aria-label={nextLabel}
            onClick={() => step(1)}
          >
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
      {photos.length > 1 && (
        <div
          ref={thumbnails}
          className="lightbox-thumbnails"
          aria-label="Choose a photograph"
        >
          {photos.map((photo, index) => (
            <button
              key={photo.originalSrc || photo.src}
              type="button"
              aria-label={`Show photograph ${index + 1}: ${photo.title || photo.alt}`}
              aria-pressed={active === index}
              onClick={() => select(index)}
            >
              <ResponsiveImage src={photo.src} alt={photo.alt} sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </dialog>
  );
}
