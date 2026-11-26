import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  BedSingle,
  DoorOpen,
  Moon,
  Tent,
  Trees,
} from "lucide-react";
import { ResponsiveImage } from "@/components/responsive-image";
import { BookingCTA } from "@/components/shared/booking-cta";
import { PublicServices } from "@/components/booking/public-services";
import {
  accommodationPath,
  type Accommodation,
  type StayHighlight,
} from "@/data/accommodations";

const icons = {
  trees: Trees,
  balcony: DoorOpen,
  bed: BedDouble,
  bunks: BedSingle,
  tent: Tent,
  moon: Moon,
};

export function StayHighlights({ items }: { items: StayHighlight[] }) {
  if (!items.length) return null;
  return (
    <ul className="accommodation-highlights" aria-label="Photographed features">
      {items.map(({ icon, label }) => {
        const Icon = icons[icon];
        return (
          <li key={label}>
            <Icon size={18} strokeWidth={1.4} aria-hidden="true" />
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function AccommodationCard({
  stay,
  index = 0,
  compact = false,
}: {
  stay: Accommodation;
  index?: number;
  compact?: boolean;
}) {
  const selection = stay.photos.slice(0, compact ? 1 : 3);
  return (
    <article
      className={`accommodation-card${compact ? " accommodation-card-compact" : ""}`}
      data-reveal="rise"
    >
      <Link
        href={accommodationPath(stay.slug)}
        className={`accommodation-collage accommodation-collage-${selection.length}`}
        aria-label={`Explore ${stay.name}`}
      >
        {selection.map((photo, i) => (
          <span className="accommodation-photo" key={photo.originalSrc}>
            <ResponsiveImage
              src={photo.src}
              alt={photo.alt}
              fit="cover"
              sizes={
                compact
                  ? "(max-width: 700px) calc(100vw - 40px), 30vw"
                  : i === 0
                    ? "(max-width: 700px) calc(100vw - 40px), (max-width: 1050px) 60vw, 37vw"
                    : selection.length === 2
                      ? "(max-width: 700px) calc(100vw - 60px), 20vw"
                      : "(max-width: 700px) 44vw, 20vw"
              }
            />
          </span>
        ))}
        <span className="accommodation-photo-count">
          {stay.photos.length}{" "}
          {stay.photos.length === 1 ? "photograph" : "photographs"}
        </span>
      </Link>
      <div className="accommodation-card-copy">
        <p className="eyebrow">
          {!compact && (
            <span className="accommodation-number">
              {String(index + 1).padStart(2, "0")} /{" "}
            </span>
          )}
          {stay.category}
        </p>
        <h2>
          <Link href={accommodationPath(stay.slug)}>{stay.name}</Link>
        </h2>
        <span className="accommodation-divider" aria-hidden="true" />
        <p>{stay.description}</p>
        {!compact && <StayHighlights items={stay.highlights} />}
        <PublicServices category="ACCOMMODATION" slug={stay.slug} />
        <Link
          className="button button-primary accommodation-view"
          href={accommodationPath(stay.slug)}
          aria-label={`View Accommodation: ${stay.name}`}
        >
          View Accommodation <ArrowRight size={17} aria-hidden="true" />
        </Link>
        {!compact && (
          <BookingCTA intent="stay" subject={stay.name} variant="link">
            Book this stay
          </BookingCTA>
        )}
      </div>
    </article>
  );
}
