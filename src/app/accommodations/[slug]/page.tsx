import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { pageMetadata } from "@/lib/metadata";
import { accommodations, accommodationPath } from "@/data/accommodations";
import {
  AccommodationCard,
  StayHighlights,
} from "@/components/accommodations/accommodation-card";
import { AccommodationGallery } from "@/components/accommodations/accommodation-gallery";
import { BookingCTA } from "@/components/shared/booking-cta";
import { PublicServices } from "@/components/booking/public-services";

export const dynamicParams = false;
export function generateStaticParams() {
  return accommodations.map((stay) => ({ slug: stay.slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const stay = accommodations.find((item) => item.slug === slug);
  if (!stay) notFound();
  return pageMetadata(
    stay.name,
    stay.description,
    accommodationPath(stay.slug),
  );
}
export default async function AccommodationDetail({ params }: Props) {
  const { slug } = await params;
  const stay = accommodations.find((item) => item.slug === slug);
  if (!stay) notFound();
  const others = accommodations
    .filter((item) => item.slug !== slug)
    .slice(0, 3);
  return (
    <div className="accommodation-detail">
      <header
        className="container accommodation-detail-header"
        data-reveal="rise"
      >
        <nav className="accommodation-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/accommodations/">Accommodations</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{stay.name}</span>
        </nav>
        <p className="eyebrow">{stay.category}</p>
        <h1>{stay.name}</h1>
        <p>{stay.description}</p>
      </header>
      <section className="container" aria-label={`${stay.name} photo gallery`}>
        <AccommodationGallery name={stay.name} photos={stay.photos} />
      </section>
      <section
        className="container accommodation-information"
        aria-labelledby="stay-information-heading"
      >
        <div data-reveal="rise">
          <p className="eyebrow">A CLOSER LOOK</p>
          <h2 id="stay-information-heading">
            A space to <em>settle in.</em>
          </h2>
          <StayHighlights items={stay.highlights} />
          <PublicServices category="ACCOMMODATION" slug={stay.slug}/>
          {stay.verified && (
            <dl className="accommodation-facts">
              {stay.verified.capacity && (
                <div>
                  <dt>Guest capacity</dt>
                  <dd>Up to {stay.verified.capacity} guests</dd>
                </div>
              )}
              {stay.verified.amenities?.length ? (
                <div>
                  <dt>Verified amenities</dt>
                  <dd>{stay.verified.amenities.join(", ")}</dd>
                </div>
              ) : null}
              {stay.verified.rate && (
                <div>
                  <dt>Room rate</dt>
                  <dd>
                    {new Intl.NumberFormat("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    }).format(stay.verified.rate.amount)}{" "}
                    / {stay.verified.rate.unit}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {stay.verified?.houseRules?.length ? (
            <div className="stay-house-rules">
              <h3>House rules</h3>
              <ul>
                {stay.verified.houseRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {stay.information.length > 0 ? (
            <dl className="accommodation-facts">
              {stay.information.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="accommodation-copy">
              These photographs offer a look at the space. The resort can
              confirm guest capacity, bed arrangements, bathroom facilities, air
              conditioning and included amenities for the accommodation you
              choose.
            </p>
          )}
          {!stay.verifiedName && (
            <p className="accommodation-content-note">
              This is a descriptive photo label. Confirm the official
              accommodation name when inquiring.
            </p>
          )}
          <Link className="text-link" href="/accommodations/">
            <ArrowLeft size={16} aria-hidden="true" /> Back to all
            accommodations
          </Link>
        </div>
        <aside
          className="accommodation-inquiry"
          data-reveal="rise"
          aria-label="Inquire about this stay"
        >
          <p className="eyebrow">YOUR NEXT LITTLE ESCAPE</p>
          <h3>
            Let’s plan <em>your stay.</em>
          </h3>
          <p>
            Share your dates and group size with the resort for availability,
            the right room arrangement and a current quote.
          </p>
          <BookingCTA intent="stay" subject={stay.name}>
            Book this stay
          </BookingCTA>
          <small>
            Confirm rates, check-in times, inclusions and cancellation terms
            directly before reserving.
          </small>
        </aside>
      </section>
      {stay.variants.length > 0 && (
        <section
          className="container accommodation-options"
          aria-labelledby="room-options-heading"
        >
          <p className="eyebrow">FIND YOUR FIT</p>
          <h2 id="room-options-heading">Explore room options</h2>
          {stay.variants.map((variant) => (
            <article
              className="accommodation-variant"
              key={variant.name}
              data-reveal="rise"
            >
              <h3>{variant.name}</h3>
              <p>{variant.description}</p>
              <AccommodationGallery
                name={variant.name}
                photos={variant.photos}
              />
              <dl className="accommodation-facts">
                {variant.information.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </section>
      )}
      {others.length > 0 && (
        <section
          className="accommodation-more"
          aria-labelledby="more-accommodations-heading"
        >
          <div className="container">
            <div className="accommodation-more-heading" data-reveal="rise">
              <p className="eyebrow">ANOTHER WAY TO STAY</p>
              <h2 id="more-accommodations-heading">
                Explore More Accommodations
              </h2>
            </div>
            <div className="accommodation-related-grid">
              {others.map((item) => (
                <AccommodationCard key={item.slug} stay={item} compact />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
