import { pageMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/shared/page-intro";
import { Media } from "@/components/media";
import { VisitNote } from "@/components/shared/visit-note";
export const metadata = pageMetadata(
  "Our story",
  "Get to know Paraiso de June Quixote Ecofarm Resort in Maragondon, Cavite.",
  "/about/",
);
export default function About() {
  return (
    <>
      <PageIntro
        eyebrow="OUR STORY"
        title={
          <>
            A place to pause.
            <br />A reason to <em>explore.</em>
          </>
        }
        description="Nature, time together, and a little adventure. Get to know Paraiso de June Quixote Ecofarm Resort, in Maragondon, Cavite."
      />
      <div className="container full-media">
        <Media
          label="The setting for your next escape"
          alt="Approved resort landscape photograph pending"
        />
      </div>
      <section className="container about-body">
        <div>
          <p className="eyebrow">A DIFFERENT KIND OF DAY</p>
          <h2>
            Less everyday.
            <br />
            More <em>together.</em>
          </h2>
        </div>
        <div>
          <p>
            A family outing. A day with friends. A slower break from a busy
            week. There are plenty of reasons to plan a visit to Paraiso.
          </p>
          <p>
            The resort brings nature and adventure into the same conversation.
            Explore the reported activities, ask about a pool day, or find out
            how to turn your visit into an overnight stay.
          </p>
          <p>
            We’re building this website around the real place. Official
            photography, a fuller resort history, and confirmed facility
            information will be added as the resort approves them.
          </p>
        </div>
      </section>
      <div className="container editorial-quote">
        <blockquote>
          “Some days are for doing a little more.
          <br />
          Others are for doing a little less.”
        </blockquote>
        <p>THE SPIRIT OF YOUR PARAISO ESCAPE · EDITORIAL COPY</p>
      </div>
      <VisitNote title="Start with your kind of escape." />
    </>
  );
}
