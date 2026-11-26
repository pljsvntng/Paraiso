import { pageMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/shared/page-intro";
import { ArrowUpRight } from "lucide-react";
import { site } from "@/config/site";
import { ResortLocation } from "@/components/shared/resort-location";
import { Suspense } from "react";
import { InquiryForm } from "@/components/shared/inquiry-form";
import { getBookingLink } from "@/config/booking";
export const metadata = pageMetadata(
  "Contact & location",
  "Find Paraiso de June Quixote Ecofarm Resort in Mabacao, Tulay B, Maragondon, Cavite. Explore the map, get directions, or contact the resort.",
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
          <a
            className="button button-light"
            href={site.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open official Facebook (opens in a new tab)"
          >
            Open official Facebook <ArrowUpRight size={17} aria-hidden="true" />
          </a>
          <p className="small-copy" style={{ marginTop: 20 }}>
            Opens in a new tab. For a prepared message, use the inquiry draft
            below.
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
                  : "Tulay Silangan, Maragondon, Cavite & Malainen Luma, Naic, Cavite"}
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
                  "Ask through the official Facebook page"
                )}
              </span>
            </li>
            <li>
              <span>Email</span>
              <span>
                {site.email ? (
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                ) : (
                  "Ask through the official Facebook page"
                )}
              </span>
            </li>
            <li>
              <span>Operating hours</span>
              <span>
                {site.hours || "Confirm current hours with the resort"}
              </span>
            </li>
          </ul>
        </section>
      </div>
      <section
        id="inquiry"
        className="container inquiry-section"
        aria-labelledby="inquiry-heading"
      >
        <div className="inquiry-introduction">
          <p className="eyebrow">A LITTLE HELP GETTING STARTED</p>
          <h2 id="inquiry-heading">
            Make it <em>your kind of visit.</em>
          </h2>
          <p>
            Prepare a message with your preferred stay, activity or group plans.
            This opens your own email app; the website does not deliver messages
            or confirm reservations.
          </p>
          {getBookingLink().isInquiry && (
            <p className="small-copy">
              You can request a reservation through our online booking page.
              Staff personally review and confirm each request.
            </p>
          )}
        </div>
        <Suspense
          fallback={
            <p className="small-copy">
              The inquiry draft requires JavaScript. You can also use the email,
              phone or official Facebook links above.
            </p>
          }
        >
          <InquiryForm />
        </Suspense>
      </section>
      <ResortLocation />
      <section id="privacy" className="container privacy-note">
        <p className="eyebrow">ABOUT THIS WEBSITE</p>
        <h2>Your visit, with a little clarity.</h2>
        <p>
          This website securely records reservation requests for staff review.
          No online payment, card details, wallet account or payment screenshot
          is required to submit a request. Staff accounts are private. Guest
          reviews are written directly on Google Maps, where Google handles
          sign-in, submission and storage. This website does not collect review
          submissions or store inquiry drafts. Inquiry details remain in your
          browser until you copy them or open your email app, where you control
          sending. Selected reviews are manually republished with permission. It
          does not use first-party analytics. The hosting provider may retain
          standard access logs under its own policy.
        </p>
        <p>
          The embedded map connects to Google, which may process device and
          connection information under its{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            privacy policy<span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
        <p>
          Links to Facebook open a separate service governed by that service’s
          privacy practices. Share only the information necessary for your
          inquiry, and ask the resort how it will handle your details.
          Reservation contact details, dates and requests are stored in the
          resort’s private database and shared only with authorized staff and
          configured email and Microsoft Excel services for reservation
          management. Historical financial records remain private and available
          to authorized users. Contact the resort to request access, correction
          or deletion where applicable.
        </p>
      </section>
    </>
  );
}
