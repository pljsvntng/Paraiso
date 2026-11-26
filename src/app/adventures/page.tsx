import { pageMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/shared/page-intro";
import { Media } from "@/components/media";
import { VisitNote } from "@/components/shared/visit-note";
import { BookingCTA } from "@/components/shared/booking-cta";
import { adventures } from "@/data/adventures";
import { CatalogBrowser } from "@/components/shared/catalog-browser";
import { PublicServices } from "@/components/booking/public-services";
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
            Only resort-enabled activities accept online reservations. Current
            configured schedules, prices and requirements appear in booking
            details. Ask the resort about attractions whose operation is still
            awaiting confirmation.
          </div>
        </aside>
        <CatalogBrowser
          label="activities"
          commercialCategory="ACTIVITY"
          items={adventures.map((item, index) => ({
            id: item.slug,
            title: item.name,
            category: item.category,
            searchText: item.description,
            content: (
              <section
                id={item.slug}
                className="experience-row"
                key={item.slug}
              >
                <Media
                  src={item.image}
                  label={item.name}
                  alt={`${item.name} at Paraiso`}
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
                  <PublicServices category="ACTIVITY" slug={item.slug} />
                  {item.verified?.requirements?.length ? (
                    <ul className="activity-requirements">
                      {item.verified.requirements.map((requirement) => (
                        <li key={requirement}>{requirement}</li>
                      ))}
                    </ul>
                  ) : null}
                  <br />
                  <BookingCTA
                    intent="adventure"
                    subject={item.name}
                    variant="outline"
                  >
                    Inquire about this experience
                  </BookingCTA>
                </div>
              </section>
            ),
          }))}
        />
      </div>
      <VisitNote title="A good adventure starts with good information.">
        Ask about current operation, schedules, participation requirements, and
        supervision. Follow the resort’s confirmed guidance for every activity.
      </VisitNote>
    </>
  );
}
