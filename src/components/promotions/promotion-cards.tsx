"use client";

import { useId, useRef, useState, type MouseEvent } from "react";
import { ResponsiveImage } from "@/components/responsive-image";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Leaf,
  Maximize2,
  X,
} from "lucide-react";
import {
  getActivePromotions,
  getPromotionLink,
  type Promotion,
} from "@/data/promotions";
import { useScrollCarousel } from "@/hooks/use-scroll-carousel";
import { useResortDate } from "@/hooks/use-resort-date";
import { BookingCTA } from "@/components/shared/booking-cta";
import { getPastPromotions } from "@/lib/promotions";

function PastPromotions({ items, date }: { items: Promotion[]; date: string }) {
  const past = getPastPromotions(
    items,
    new Date(`${date}T12:00:00+08:00`),
  ).filter((item) => item.featured !== false);
  if (!past.length) return null;
  return (
    <details
      className="past-promotions"
      open={
        !getActivePromotions(items, new Date(`${date}T12:00:00+08:00`)).some(
          (item) => item.featured !== false,
        )
      }
    >
      <summary>
        <span>
          Past promotions{" "}
          <small>{String(past.length).padStart(2, "0")} original posters</small>
        </span>
        <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <p className="past-promotions-note">
        A look back at Paraiso. These offers have ended; posters are kept for
        reference. Contact the resort for current availability and offers.
      </p>
      <PromotionCards items={items} initialDate={date} archive />
    </details>
  );
}

function PromotionDates({ item }: { item: Promotion }) {
  if (
    !item.promotionalDate &&
    !item.validityPeriod &&
    !item.startDate &&
    !item.endDate
  )
    return null;
  return (
    <div className="promotion-dates">
      <CalendarDays size={16} aria-hidden="true" />
      <div>
        {item.promotionalDate && <p>{item.promotionalDate}</p>}
        {item.validityPeriod && <p>Valid: {item.validityPeriod}</p>}
        {!item.validityPeriod && (item.startDate || item.endDate) && (
          <p>
            {item.startDate ? `From ${item.startDate}` : ""}
            {item.endDate ? ` · Until ${item.endDate}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function PromotionLink({ item }: { item: Promotion }) {
  const href = getPromotionLink(item.ctaLink);
  if (!href) return null;
  const external = href.startsWith("https:");
  return (
    <a
      className="text-link promotion-action"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {item.ctaLabel || "Learn more"}
      <ArrowUpRight size={16} aria-hidden="true" />
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

export function PromotionCards({
  items,
  initialDate,
  archive = false,
}: {
  items: Promotion[];
  initialDate: string;
  archive?: boolean;
}) {
  const date = useResortDate(initialDate);
  const activeItems = getActivePromotions(
    items,
    new Date(`${date}T12:00:00+08:00`),
  ).filter((item) => item.featured !== false);
  const displayedItems = archive
    ? getPastPromotions(items, new Date(`${date}T12:00:00+08:00`)).filter(
        (item) => item.featured !== false,
      )
    : activeItems;
  const { track, position, maxIndex, measure, goTo } = useScrollCarousel(
    displayedItems.length,
    "--promotion-columns",
  );
  const [current, setCurrent] = useState<Promotion | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const trackId = useId();

  function open(item: Promotion) {
    setCurrent(item);
    dialog.current?.showModal();
  }

  function preview(event: MouseEvent<HTMLAnchorElement>, item: Promotion) {
    // Preserve modified clicks and the direct-poster fallback without JavaScript.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    open(item);
  }

  if (!displayedItems.length && !current)
    return archive ? null : (
      <>
        <div className="promotions-empty">
          <span className="promotions-empty-icon" aria-hidden="true">
            <Leaf size={30} strokeWidth={1.2} />
          </span>
          <div>
            <h3>No current offers announced.</h3>
            <p>
              When there&apos;s something new at Paraiso, you&apos;ll find it
              here. For your upcoming visit,{" "}
              <a href="/contact/">get in touch with the resort</a>.
            </p>
          </div>
        </div>
        <PastPromotions items={items} date={date} />
      </>
    );
  return (
    <>
      <div
        className="promotion-carousel"
        role="region"
        aria-label={
          archive ? "Past resort promotions" : "Current resort announcements"
        }
        aria-roledescription="carousel"
      >
        <div
          className="promotions-grid"
          ref={track}
          id={trackId}
          onScroll={measure}
          tabIndex={maxIndex > 0 ? 0 : undefined}
          aria-label="Browse promotions. Swipe, or use Left and Right arrow keys."
          onKeyDown={(event) => {
            if (
              event.target !== event.currentTarget ||
              !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            )
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
          {displayedItems.map((item) => (
            <article className="promotion-card" key={item.id}>
              <a
                className="promotion-poster"
                href={item.image}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Preview ${item.title}`}
                aria-haspopup="dialog"
                onClick={(event) => preview(event, item)}
              >
                <ResponsiveImage
                  src={item.image}
                  alt={item.imageAlt || item.title}
                  fit="contain"
                  sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 33vw"
                />
              </a>
              <div className="promotion-copy">
                {archive && (
                  <p className="promotion-expired">
                    Past promotion · Ended {item.endDate}
                  </p>
                )}
                {item.category && (
                  <p className="eyebrow promotion-category">{item.category}</p>
                )}
                <h3>{item.title}</h3>
                <p className="promotion-description">{item.description}</p>
                <PromotionDates item={item} />
                {!archive && item.verifiedPrice && <p>{item.verifiedPrice}</p>}
                {!archive && getPromotionLink(item.ctaLink) ? (
                  <PromotionLink item={item} />
                ) : (
                  <button
                    type="button"
                    className="text-link promotion-action"
                    onClick={() => open(item)}
                    aria-haspopup="dialog"
                    aria-label={`${archive ? "View past promotion" : item.ctaLabel || "View details"}: ${item.title}`}
                  >
                    {archive
                      ? "View past promotion"
                      : item.ctaLabel || "View details"}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {maxIndex > 0 && (
          <div className="promotion-carousel-controls">
            <span aria-live="polite">
              {position.active + 1}–
              {Math.min(
                displayedItems.length,
                position.active + position.visible,
              )}{" "}
              of {displayedItems.length}
            </span>
            <div>
              <button
                className="icon-button"
                type="button"
                aria-controls={trackId}
                disabled={position.active === 0}
                aria-label="Previous promotions"
                onClick={() => goTo(position.active - 1)}
              >
                <ArrowLeft size={19} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-controls={trackId}
                disabled={position.active >= maxIndex}
                aria-label="Next promotions"
                onClick={() => goTo(position.active + 1)}
              >
                <ArrowRight size={19} />
              </button>
            </div>
          </div>
        )}
      </div>
      {!archive && <PastPromotions items={items} date={date} />}
      <dialog
        ref={dialog}
        className="lightbox promotion-dialog"
        aria-labelledby={current ? titleId : undefined}
        aria-describedby={current ? descriptionId : undefined}
        onClose={() => setCurrent(null)}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href]",
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="lightbox-top promotion-dialog-top">
          <span>THE PARAISO NOTICEBOARD</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Close promotion preview"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {current && (
          <div className="promotion-dialog-content">
            <div className="promotion-dialog-poster">
              <ResponsiveImage
                key={current.id}
                src={current.image}
                alt={current.imageAlt || current.title}
                fit="contain"
                sizes="(max-width: 700px) 100vw, 75vw"
              />
            </div>
            <div className="promotion-dialog-copy">
              {current.category && (
                <p className="eyebrow promotion-category">{current.category}</p>
              )}
              <h3 id={titleId}>{current.title}</h3>
              <p id={descriptionId}>{current.description}</p>
              {current.details && (
                <p className="promotion-details">{current.details}</p>
              )}
              <PromotionDates item={current} />
              {activeItems.some((item) => item.id === current.id) ? (
                <>
                  <PromotionLink item={current} />
                  <BookingCTA subject={current.title} variant="outline">
                    Inquire about this announcement
                  </BookingCTA>
                </>
              ) : (
                <p className="small-copy">
                  This announcement is no longer current. Ask the resort about
                  offers for your visit.
                </p>
              )}
              <a
                className="text-link promotion-original"
                href={current.image}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open original poster <Maximize2 size={14} aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
