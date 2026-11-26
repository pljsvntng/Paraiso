import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { pageMetadata } from "@/lib/metadata";
import { ResponsiveImage } from "@/components/responsive-image";
import { AccommodationCard } from "@/components/accommodations/accommodation-card";
import { VisitNote } from "@/components/shared/visit-note";
import { accommodations } from "@/data/accommodations";
import { photos } from "@/config/media";
import { CatalogBrowser } from "@/components/shared/catalog-browser";

export const metadata = pageMetadata(
  "Accommodations",
  "Comfortable stays for a relaxing resort getaway at Paraiso de June Quixote Ecofarm Resort.",
  "/accommodations/",
);
export default function Accommodations() {
  return (
    <>
      <section
        className="accommodation-hero"
        aria-labelledby="accommodation-title"
      >
        <ResponsiveImage
          src={photos.stay.src}
          alt={photos.stay.alt}
          priority
          sizes="100vw"
          fit="cover"
        />
        <div className="accommodation-hero-shade" aria-hidden="true" />
        <div className="container accommodation-hero-copy" data-reveal="fade">
          <nav className="accommodation-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Accommodations</span>
          </nav>
          <p className="eyebrow">STAY A LITTLE LONGER</p>
          <h1 id="accommodation-title">Accommodations</h1>
          <p>Comfortable stays for a relaxing resort getaway.</p>
          <a className="accommodation-scroll-link" href="#stays">
            Explore the stays <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
      <section
        className="container accommodation-list"
        id="stays"
        aria-labelledby="stay-heading"
      >
        <div className="accommodation-list-intro" data-reveal="rise">
          <div>
            <p className="eyebrow">REST. RECHARGE. RECONNECT.</p>
            <h2 id="stay-heading">
              Make room for <em>a little calm.</em>
            </h2>
          </div>
          <p>
            Explore the cabins, rooms and outdoor stays photographed at Paraiso.
            Ask the resort to confirm the accommodation name, arrangements and
            availability for your visit.
          </p>
        </div>
        <CatalogBrowser
          label="stays"
          commercialCategory="ACCOMMODATION"
          className="accommodation-cards"
          items={accommodations.map((stay, index) => ({
            id: stay.slug,
            title: stay.name,
            category: stay.category,
            searchText: stay.description,
            capacity: stay.verified?.capacity,
            price: stay.verified?.rate?.amount,
            amenities: stay.verified?.amenities,
            content: <AccommodationCard stay={stay} index={index} />,
          }))}
        />
      </section>
      <VisitNote title="Find the right stay for your escape.">
        Share your dates, number of adults and children, and any accessibility
        needs. Confirm room arrangements, current rates and reservation terms
        with the resort before booking.
      </VisitNote>
    </>
  );
}
