import { pageMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/shared/page-intro";
import { BookingCTA } from "@/components/shared/BookingCTA";
import { site } from "@/config/site";
export const metadata = pageMetadata(
  "Contact & location",
  "Contact Paraiso through the official Facebook page and request the verified address and directions before travelling.",
  "/contact/",
);
export default function Contact() {
  return (
    <>
      <PageIntro
        eyebrow="LET’S MAKE A PLAN"
        title={
          <>
            Your escape
            <br />
            starts with <em>hello.</em>
          </>
        }
        description="Thinking of a visit? Talk to the resort team about your dates, your people, and the kind of day you have in mind."
      />
      <div className="container contact-grid">
        <section className="contact-primary">
          <p className="eyebrow">STRAIGHT TO THE RESORT</p>
          <h2>
            Tell us what
            <br />
            you have <em>in mind.</em>
          </h2>
          <p>
            For current information and visit arrangements, use the official
            Facebook page supplied by the resort brief.
          </p>
          <p>
            Share your preferred date, group size, and interests. Ask the team
            for the full price and confirmation before making plans.
          </p>
          <BookingCTA variant="light">Open official Facebook</BookingCTA>
          <p className="small-copy" style={{ marginTop: 20 }}>
            Opens in a new tab. No inquiry form or reservation is submitted on
            this website.
          </p>
        </section>
        <section className="contact-details">
          <p className="eyebrow">THE USEFUL DETAILS</p>
          <h2>
            Good to <em>know.</em>
          </h2>
          <ul className="details-list">
            <li>
              <span>Location</span>
              <span>
                {site.region}, {site.country}
              </span>
            </li>
            <li>
              <span>Exact address</span>
              <span>
                {site.locationVerified && site.address
                  ? site.address
                  : "Please request the verified address and map pin."}
              </span>
            </li>
            <li>
              <span>Contact number</span>
              <span>
                {site.phone ? (
                  <a href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}>
                    {site.phone}
                  </a>
                ) : (
                  "Not yet verified. Please use official Facebook."
                )}
              </span>
            </li>
            <li>
              <span>Email</span>
              <span>
                {site.email ? (
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                ) : (
                  "Not yet verified. Please use official Facebook."
                )}
              </span>
            </li>
            <li>
              <span>Operating hours</span>
              <span>{site.hours || "Ask the resort for current hours."}</span>
            </li>
          </ul>
        </section>
      </div>
      <section className="container location-panel">
        <div className="location-copy">
          <p className="eyebrow">THE WAY TO PARAISO</p>
          <h2>
            A little planning.
            <br />A better <em>arrival.</em>
          </h2>
          <p>
            Public listings refer to Mabacao / Tulay B, Maragondon, Cavite. The
            precise business address and map pin still require the resort’s
            verification.
          </p>
          <p>
            We’ll add directions and a map once the location is confirmed. Until
            then, ask the team for their preferred route.
          </p>
          {site.locationVerified && site.directionsUrl ? (
            <a
              className="button button-primary"
              href={site.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions ↗
            </a>
          ) : (
            <BookingCTA variant="outline">Ask for the map pin</BookingCTA>
          )}
        </div>
        {site.locationVerified && site.mapEmbedUrl ? (
          <iframe
            className="map-frame"
            src={site.mapEmbedUrl}
            title="Verified resort location"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="map-pending">
            <p>
              Maragondon,
              <br />
              <em>Cavite.</em>
            </p>
            <small>
              MAP PLACEHOLDER
              <br />
              Exact resort pin awaiting verification.
            </small>
          </div>
        )}
      </section>
      <section id="privacy" className="container privacy-note">
        <p className="eyebrow">ABOUT THIS WEBSITE</p>
        <h2>Your visit, with a little clarity.</h2>
        <p>
          This static website has no inquiry forms, user accounts, payment
          collection, or booking processing. It does not ask for guest details
          or use analytics or tracking tools. The hosting provider may retain
          standard access logs under its own policy.
        </p>
        <p>
          Links to Facebook and any future external reservation website open a
          separate service governed by that service’s privacy practices. Share
          only the information necessary for your inquiry, and ask the resort
          how it will handle your details. This notice must be reviewed again if
          forms, analytics, or other services are introduced.
        </p>
      </section>
    </>
  );
}
