import { pageMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/shared/page-intro";
import { Media } from "@/components/media";
import { VisitNote } from "@/components/shared/visit-note";
import { BookingCTA } from "@/components/shared/BookingCTA";
import { accommodations } from "@/data/accommodations";
export const metadata = pageMetadata(
  "Stay a little longer",
  "Inquire about overnight accommodations at Paraiso de June Quixote Ecofarm Resort.",
  "/accommodations/",
);
export default function Stay() {
  const approved = accommodations.filter((item) => item.approved);
  return (
    <>
      <PageIntro
        eyebrow="STAY AT PARAISO"
        title={
          <>
            Let the day last
            <br />a little <em>longer.</em>
          </>
        }
        description="Take your time. Ask about an overnight stay and give your visit a little more room to unfold."
      >
        <BookingCTA intent="stay">Inquire about a stay</BookingCTA>
      </PageIntro>
      <section className="container info-split">
        <Media
          className="media-warm"
          label="Room to slow down"
          alt="Approved accommodation photograph pending"
        />
        <div>
          <p className="eyebrow">REST. RECHARGE. RECONNECT.</p>
          <h2>
            A quieter end
            <br />
            to an <em>active day.</em>
          </h2>
          <p>
            Find out which accommodation suits your group. The team can share
            room photographs, arrangements, and a current quote for your
            preferred dates.
          </p>
          <ul className="details-list">
            <li>
              <span>Room types & bed arrangements</span>
              <span>Ask the team</span>
            </li>
            <li>
              <span>Guest capacities & amenities</span>
              <span>To be confirmed</span>
            </li>
            <li>
              <span>Rates & check-in details</span>
              <span>Inquire for current information</span>
            </li>
          </ul>
          <p className="small-copy">
            Room categories, prices, and availability are not yet published. No
            reservation is processed on this website.
          </p>
        </div>
      </section>
      {approved.length > 0 ? (
        <section className="container">
          {approved.map((item) => (
            <article className="experience-row" key={item.slug}>
              <Media
                src={item.image}
                alt={item.name}
                label={item.name}
                className="media-warm"
              />
              <div>
                <h2>{item.name}</h2>
                <p>{item.description}</p>
                {item.capacity && <p>Up to {item.capacity} guests</p>}
                {item.bedConfiguration && <p>{item.bedConfiguration}</p>}
                <BookingCTA intent="stay">Inquire about this stay</BookingCTA>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="container">
          <div className="editorial-empty">
            <p className="eyebrow">THE DETAILS MATTER</p>
            <h3>Let’s find the right stay for you.</h3>
            <p>
              Approved accommodation details are being prepared. Tell the resort
              your dates, number of adults and children, and any accessibility
              needs.
            </p>
            <BookingCTA intent="stay" variant="link">
              Ask about overnight options
            </BookingCTA>
          </div>
        </div>
      )}
      <VisitNote title="One more thing before you settle in.">
        Ask the team to confirm room arrangements, the full rate, payment
        requirements, and cancellation terms directly before reserving.
      </VisitNote>
    </>
  );
}
