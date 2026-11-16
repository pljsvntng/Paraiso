import { pageMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/shared/page-intro";
import { Media } from "@/components/media";
import { VisitNote } from "@/components/shared/visit-note";
import { BookingCTA } from "@/components/shared/BookingCTA";
import { packages, groupInquiryTopics } from "@/data/packages";
export const metadata = pageMetadata(
  "Groups & offers",
  "Ask the resort about group visits and approved packages for your preferred dates.",
  "/packages/",
);
export default function Packages() {
  const published = packages.filter((item) => item.approved);
  return (
    <>
      <PageIntro
        eyebrow="GROUPS & OFFERS"
        title={
          <>
            Your people.
            <br />
            Your kind of <em>day.</em>
          </>
        }
        description="Bring everyone into the plan. Talk to the resort about a family day, a barkada escape, or your next group get-together."
      />
      <section className="container info-split">
        <Media
          label="Better days, together"
          alt="Approved photograph of resort gathering areas pending"
        />
        <div>
          <p className="eyebrow">SOMETHING TO PLAN TOGETHER</p>
          <h2>
            Good company
            <br />
            is a <em>good start.</em>
          </h2>
          <p>
            Tell the team what you have in mind. These are conversation
            starters, rather than advertised packages.
          </p>
          <ul className="package-list">
            {groupInquiryTopics.map((topic, i) => (
              <li key={topic}>
                {topic}
                <span>0{i + 1} / INQUIRE</span>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 28 }}>
            <BookingCTA intent="group">Discuss a group visit</BookingCTA>
          </div>
        </div>
      </section>
      <section className="container">
        {published.length ? (
          published.map((item) => (
            <article className="editorial-empty" key={item.name}>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              <ul>
                {item.inclusions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {item.priceLabel && <p>{item.priceLabel}</p>}
              <BookingCTA intent="group">Inquire about this package</BookingCTA>
            </article>
          ))
        ) : (
          <div className="editorial-empty">
            <p className="eyebrow">CURRENT OFFERS</p>
            <h3>No confirmed packages published yet.</h3>
            <p>
              Ask the resort about any offers for your dates. Prices,
              inclusions, validity, and terms must be confirmed directly.
            </p>
          </div>
        )}
      </section>
      <VisitNote title="Big plans deserve a little conversation." />
    </>
  );
}
