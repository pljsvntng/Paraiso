"use client";

import { useId, type CSSProperties } from "react";
import { useScrollCarousel } from "@/hooks/use-scroll-carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReviewCardData } from "@/types/reviews";
import { ReviewCard } from "./review-card";

export function ReviewCarousel({ items }: { items: ReviewCardData[] }) {
  const id = useId();
  const { track, position, maxIndex, measure, goTo } = useScrollCarousel(
    items.length,
    "--review-columns",
  );

  return (
    <div
      className={`review-carousel review-count-${items.length}`}
      style={{ "--review-count": items.length } as CSSProperties}
      role="region"
      aria-roledescription="carousel"
      aria-label="Guest review cards"
    >
      <p id={`${id}-instructions`} className="sr-only">
        Swipe to browse, or focus the cards and use Left and Right arrow keys.
        Home and End go to the first and last position.
      </p>
      <div
        ref={track}
        id={id}
        className="review-track"
        tabIndex={maxIndex > 0 ? 0 : undefined}
        aria-label="Browse guest review cards"
        aria-describedby={`${id}-instructions`}
        onScroll={measure}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          goTo(
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? maxIndex
                : position.active + (event.key === "ArrowRight" ? 1 : -1),
          );
        }}
      >
        {items.map((review, index) => (
          <div
            className="review-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${items.length}`}
            key={review.id}
          >
            <ReviewCard review={review} />
          </div>
        ))}
      </div>
      {maxIndex > 0 && (
        <div className="review-carousel-controls">
          <span
            className="review-carousel-status"
            aria-live="polite"
            aria-atomic="true"
          >
            {items.length ? position.active + 1 : 0}–
            {Math.min(items.length, position.active + position.visible)}{" "}
            <span>of {items.length}</span>
          </span>
          <div className="review-dots" aria-label="Carousel positions">
            {Array.from({ length: maxIndex + 1 }, (_, index) => (
              <button
                type="button"
                key={index}
                aria-label={`Show cards starting at ${index + 1}`}
                aria-current={position.active === index ? "true" : undefined}
                aria-controls={id}
                onClick={() => goTo(index)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="review-arrows">
            <button
              type="button"
              className="review-icon-button"
              aria-label="Previous reviews"
              aria-controls={id}
              disabled={position.active === 0}
              onClick={() => goTo(position.active - 1)}
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="review-icon-button"
              aria-label="Next reviews"
              aria-controls={id}
              disabled={position.active >= maxIndex}
              onClick={() => goTo(position.active + 1)}
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
