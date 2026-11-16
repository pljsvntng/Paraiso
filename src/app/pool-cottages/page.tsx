import { pageMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/shared/page-intro";
import { Media } from "@/components/media";
import { VisitNote } from "@/components/shared/visit-note";
import { BookingCTA } from "@/components/shared/BookingCTA";
export const metadata = pageMetadata(
  "Swimming & cottages",
  "Plan a pool day or inquire about cottage arrangements at Paraiso de June Quixote Ecofarm Resort.",
  "/pool-cottages/",
);
export default function Swimming() {
  return (
    <>
      <PageIntro
        eyebrow="SWIMMING & COTTAGES"
        title={
          <>
            More splashes.
            <br />
            Less <em>screen time.</em>
          </>
        }
        description="A day out with your favourite people. Ask about swimming, cottages, and the arrangements for your next get-together."
      />
      <section className="pool-banner">
        <div className="container">
          <div>
            <p className="eyebrow">MAKE A DAY OF IT</p>
            <h2>
              Sunshine,
              <br />
              splashes, and
              <br />
              <em>good times.</em>
            </h2>
            <p>
              Before you pack for a pool day, check current swimming access,
              entrance fees, operating hours, and guest guidelines with the
              resort.
            </p>
            <BookingCTA intent="cottage" variant="outline">
              Plan a pool day
            </BookingCTA>
          </div>
          <Media
            label="The refreshing side of Paraiso"
            alt="Approved swimming pool photograph pending"
            className="media-lagoon"
          />
        </div>
      </section>
      <section className="container info-split">
        <div>
          <p className="eyebrow">SAVE A SPACE FOR EVERYONE</p>
          <h2>
            Your own little
            <br />
            <em>gathering place.</em>
          </h2>
          <p>
            Ask the team about cottage options and the right arrangement for
            your group. Cottage names, capacities, inclusions, and prices will
            be published once approved.
          </p>
          <BookingCTA intent="cottage" variant="link">
            Inquire about a cottage
          </BookingCTA>
        </div>
        <div>
          <p className="eyebrow">YOUR POOL DAY CHECKLIST</p>
          <ul className="details-list">
            <li>
              <span>Swimming access & entrance rates</span>
              <span>Confirm with the resort</span>
            </li>
            <li>
              <span>Cottage capacity & inclusions</span>
              <span>Ask about your group size</span>
            </li>
            <li>
              <span>Food & drink arrangements</span>
              <span>Ask for current guidelines</span>
            </li>
            <li>
              <span>Pool hours & guest guidance</span>
              <span>To be confirmed</span>
            </li>
          </ul>
          <p className="small-copy">
            This website does not show live cottage or pool availability.
          </p>
        </div>
      </section>
      <VisitNote title="Bring the questions. We’ll help with the plan." />
    </>
  );
}
