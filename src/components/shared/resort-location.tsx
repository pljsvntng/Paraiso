import { ArrowUpRight, MapPin } from "lucide-react";
import { site } from "@/config/site";
import { Button } from "@/components/ui/button";
import { BookingCTA } from "./booking-cta";
import { LocationMap } from "./location-map";

export function ResortLocation() {
  const verified = site.locationVerified;
  const mapUrl = verified && site.mapUrl ? site.mapUrl : site.mapSearchUrl;
  return (
    <section id="location" className="location-section" aria-labelledby="location-title">
      <div className="container location-panel">
        <div className="location-copy" data-reveal="fade">
          <p className="eyebrow">THE WAY TO PARAISO</p>
          <h2 id="location-title">Find Your Way to <em>Paradise</em></h2>
          <p>Your next unforgettable escape is waiting. Find us and start your journey to Paraiso de June Quixote.</p>
        </div>
        {verified && site.mapEmbedUrl ? (
          <LocationMap src={site.mapEmbedUrl} title={`${site.name} — interactive Google Map`} />
        ) : (
          <div className="map-pending" data-reveal="fade">
            <MapPin size={28} strokeWidth={1} aria-hidden="true" />
            <p>Maragondon,<br /><em>Cavite.</em></p>
            <span>PHILIPPINES</span>
            <small>Exact resort pin awaiting confirmation</small>
          </div>
        )}
        <div className="location-details">
          <div className="location-address">
            <MapPin size={22} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <h3>{site.name}</h3>
              <address>{verified && site.address ? site.address : `${site.region}, ${site.country}`}</address>
              <div className="location-contact">
                {site.phone && <a href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}>{site.phone}</a>}
                {site.email && <a href={`mailto:${site.email}`}>{site.email}</a>}
                <a href={site.facebook} target="_blank" rel="noopener noreferrer">
                  Official Facebook<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </div>
          </div>
          <div className="location-actions">
            <Button asChild>
              <a href={verified && site.directionsUrl ? site.directionsUrl : mapUrl} target="_blank" rel="noopener noreferrer">
                Get Directions <ArrowUpRight size={17} aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
            <a className="text-link" href={mapUrl} target="_blank" rel="noopener noreferrer">
              Open in Google Maps <ArrowUpRight size={17} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <BookingCTA variant="link">Ask the resort</BookingCTA>
          </div>
        </div>
      </div>
    </section>
  );
}
