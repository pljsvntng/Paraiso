import { pageMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/shared/page-intro";
import { Media } from "@/components/media";
import { VisitNote } from "@/components/shared/visit-note";
import { BookingCTA } from "@/components/shared/BookingCTA";
import { adventures } from "@/data/adventures";
export const metadata = pageMetadata(
  "Adventures & activities",
  "Explore reported adventure experiences at Paraiso and ask the resort about current operation and requirements.",
  "/adventures/",
);
export default function Adventures() {
  return (
    <>
      <PageIntro
        eyebrow="THE ADVENTUROUS SIDE"
        title={
          <>
            A little fresh air.
            <br />A little <em>adrenaline.</em>
          </>
        }
        description="Have an experience in mind? Explore the activities reported at Paraiso and check with the team to make a plan for your visit."
      />
      <div className="container">
        <aside className="adventure-notice">
          <span>GOOD TO KNOW</span>
          <div>
            These attractions are reported in the supplied resort brief. Current
            operation, schedules, prices, and participation requirements have
            not been confirmed. Please ask the resort before travelling.
          </div>
        </aside>
        {adventures.map((item, index) => (
          <section id={item.slug} className="experience-row" key={item.slug}>
            <Media
              src={item.confirmed ? item.image : null}
              label={item.name}
              alt={`Approved ${item.name} photograph pending`}
              className={
                index % 3 === 0
                  ? "media-forest"
                  : index % 3 === 1
                    ? "media-warm"
                    : "media-lagoon"
              }
            />
            <div>
              <p className="eyebrow">
                0{index + 1} / {item.category}
              </p>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              <span className="status-label">
                {item.confirmed
                  ? "Confirm your preferred session with the team"
                  : "Current availability to be confirmed"}
              </span>
              <br />
              <BookingCTA intent="adventure" variant="outline">
                Inquire about this experience
              </BookingCTA>
            </div>
          </section>
        ))}
      </div>
      <VisitNote title="A good adventure starts with good information.">
        Ask about current operation, schedules, participation requirements, and
        supervision. Follow the resort’s confirmed guidance for every activity.
      </VisitNote>
    </>
  );
}
