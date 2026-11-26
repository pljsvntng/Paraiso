import { pageMetadata } from "@/lib/metadata";
import { PublicServices } from "@/components/booking/public-services";
import { PageIntro } from "@/components/shared/page-intro";
import { Media } from "@/components/media";
import { VisitNote } from "@/components/shared/visit-note";
import { BookingCTA } from "@/components/shared/booking-cta";
import { PhotoCollection } from "@/components/photo-collection";
export const metadata = pageMetadata(
  "Dining at Paraiso",
  "Ask about current restaurant service and dining arrangements for your visit to Paraiso.",
  "/dining/",
);
export default function Dining() {
  return (
    <>
      <PageIntro
        eyebrow="AT THE TABLE"
        title={
          <>
            Good food.
            <br />
            Great <em>company.</em>
          </>
        }
        description="Leave a little time to gather around the table. Find out about dining options during your visit."
      >
        <BookingCTA
          intent="dining"
          subject="Dining arrangements"
          variant="outline"
        >
          Ask about dining
        </BookingCTA>
      </PageIntro>
      <section className="container dining-feature">
        <Media
          asset="dining"
          className="media-clay"
          label="A seat at the table"
          alt="Dining pavilion at Paraiso"
        />
        <div className="dining-caption">
          <span>COME TOGETHER / STAY A LITTLE LONGER</span>
          <p>
            Take a moment between adventures. Make time for a meal together.
          </p>
        </div>
      </section>
      <section className="container about-body">
        <div>
          <p className="eyebrow">MAKE ROOM FOR A MEAL</p>
          <h2>
            More time
            <br />
            around <em>the table.</em>
          </h2>
        </div>
        <div>
          <p>
            Whether you’re planning a family outing or a group day, ask the team
            about restaurant service, dining times, and arrangements for your
            party.
          </p>
          <div className="editorial-empty">
            <h3>Something for your gathering.</h3>
            <p>
              Request the current menu directly from the resort, and ask about
              dietary requirements before your visit.
            </p>
            <BookingCTA
              intent="dining"
              subject="Dining arrangements"
              variant="link"
            >
              Request dining information
            </BookingCTA>
          </div>
        </div>
      </section>
      <PhotoCollection
        title="Places to gather"
        description="A look inside the dining hall and at the garden cabanas. Ask about arrangements for your group."
        ids={["diningHall", "pavilion"]}
      />
      <VisitNote title="Planning to bring the whole group?">
        Mention your group size, preferred visit date, and any dietary or
        accessibility needs when you inquire. Confirm all dining arrangements
        directly.
      </VisitNote>
      <section className="container"><h2>Reserve your dining experience.</h2><PublicServices category="DINING" /></section>
    </>
  );
}
