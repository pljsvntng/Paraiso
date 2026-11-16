import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { site } from "@/config/site";
import { Media } from "@/components/media";
import { Reveal } from "@/components/reveal";
import { BookingCTA } from "@/components/shared/BookingCTA";
import { adventures } from "@/data/adventures";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "Paraiso de June Quixote Ecofarm Resort",
  site.description,
  "/",
);

export default function Home() {
  return (
    <>
      <section className={`hero ${site.heroImage ? "hero-with-photo" : ""}`}>
        {site.heroImage ? (
          <Image
            className="hero-photo"
            src={site.heroImage}
            alt={site.heroAlt}
            fill
            priority
            sizes="100vw"
          />
        ) : (
          <div className="hero-art" aria-hidden="true">
            <div className="contour contour-one" />
            <div className="contour contour-two" />
            <div className="contour contour-three" />
            <span className="hero-sun" />
            <div className="hero-art-rule" />
            <span className="hero-art-type">
              a little
              <br />
              <i>paraiso.</i>
            </span>
          </div>
        )}
        <div className="hero-shade" />
        <div className="container hero-content">
          <p className="eyebrow">
            <span className="tiny-line" />
            MARAGONDON, CAVITE · PHILIPPINES
          </p>
          <h1>
            Stay for the calm.
            <br />
            Come for
            <br />
            <em>the thrill.</em>
          </h1>
          <p className="hero-description">
            A little closer to nature.
            <br />A little further from the everyday.
            <br />
            Welcome to Paraiso de June Quixote.
          </p>
          <div className="hero-actions">
            <Link className="button button-light" href="/adventures/">
              Explore adventures <ArrowUpRight size={17} />
            </Link>
            <BookingCTA variant="link" />
          </div>
        </div>
        <div className="container hero-bottom">
          <a href="#your-escape">
            A breath of fresh air <ArrowDown size={15} />
          </a>
          <span>
            {site.heroImage
              ? "PARAISO DE JUNE QUIXOTE ECOFARM RESORT"
              : "DESIGN PREVIEW · RESORT PHOTOGRAPH TO FOLLOW"}
          </span>
        </div>
      </section>

      <section className="visit-strip">
        <div className="container">
          <span className="eyebrow">YOUR DAY, YOUR PACE</span>
          <div>
            <Link href="/accommodations/">
              Stay awhile <ArrowUpRight size={16} />
            </Link>
            <Link href="/adventures/">
              Take an adventure <ArrowUpRight size={16} />
            </Link>
            <Link href="/pool-cottages/">
              Make a splash <ArrowUpRight size={16} />
            </Link>
          </div>
          <BookingCTA variant="link">Let’s make a plan</BookingCTA>
        </div>
      </section>

      <section id="your-escape" className="container home-story section-space">
        <Reveal className="story-copy">
          <p className="eyebrow">NOT FAR AWAY. A WORLD APART.</p>
          <h2>
            A little nature.
            <br />A lot of <em>adventure.</em>
          </h2>
          <p>
            Some days call for slowing down. Others call for a little more
            adventure. Start with what you love, bring your favourite people,
            and ask us about your kind of day at Paraiso.
          </p>
          <p className="small-copy">
            An ecofarm resort in Maragondon, Cavite. Get to know the place
            before you plan your visit.
          </p>
          <Link href="/about/" className="text-link">
            A little about Paraiso <ArrowUpRight size={17} />
          </Link>
        </Reveal>
        <div className="story-image">
          <Media
            alt="Approved photograph of the resort surroundings pending"
            label="A place to catch your breath"
          />
          <span className="image-footnote">
            01 / THE SLOWER SIDE OF PARAISO
          </span>
        </div>
      </section>

      <section className="adventure-section section-space">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FOR YOUR ADVENTUROUS SIDE</p>
              <h2>
                Take the
                <br />
                <em>scenic route.</em>
              </h2>
            </div>
            <div>
              <p>
                From trails to treetops, ask about the experiences that have put
                Paraiso on your list.
              </p>
              <Link className="text-link light" href="/adventures/">
                Explore the possibilities <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
          <div className="adventure-composition">
            <Link href="/adventures/#skywalk" className="adventure-feature">
              <Media
                className="media-forest"
                label="Skywalk Hanging Bridge"
                alt="Approved Skywalk photograph pending"
              />
              <div className="feature-caption">
                <span>01 / UP IN THE AIR</span>
                <h3>
                  A different
                  <br />
                  point of view.
                </h3>
                <ArrowUpRight size={24} />
              </div>
            </Link>
            <div className="adventure-list">
              {adventures.slice(1, 4).map((item, i) => (
                <Link href={`/adventures/#${item.slug}`} key={item.slug}>
                  <span className="list-number">0{i + 2}</span>
                  <div>
                    <small>{item.category}</small>
                    <h3>{item.name}</h3>
                    <p>Ask about current operation</p>
                  </div>
                  <ArrowUpRight size={22} />
                </Link>
              ))}
              <p className="availability-note">
                Reported experiences. Current operation, rates, and
                participation requirements must be confirmed with the resort.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container stay-section section-space">
        <div className="stay-image">
          <Media
            label="The quieter side of Paraiso"
            alt="Approved accommodation photograph pending"
            className="media-warm"
          />
        </div>
        <Reveal className="stay-copy">
          <p className="eyebrow">NO NEED TO RUSH HOME</p>
          <h2>
            Let the day
            <br />
            last a little
            <br />
            <em>longer.</em>
          </h2>
          <p>
            Turn your visit into an overnight escape. Ask the team about
            accommodation options for your dates, from room arrangements to the
            little details that make a stay comfortable.
          </p>
          <Link href="/accommodations/" className="text-link">
            Explore staying at Paraiso <ArrowUpRight size={17} />
          </Link>
        </Reveal>
        <span className="stay-side-note">LESS HURRY. MORE HERE.</span>
      </section>

      <section className="pool-section">
        <div className="container pool-grid">
          <div>
            <p className="eyebrow">JUST ADD YOUR FAVOURITE PEOPLE</p>
            <h2>
              Sunshine.
              <br />
              Splashes.
              <br />
              <em>Good times.</em>
            </h2>
            <p>
              Pool plans, cottage conversations, and a day together. Ask about
              swimming and cottage arrangements before you set off.
            </p>
            <Link href="/pool-cottages/" className="text-link">
              Pool days at Paraiso <ArrowUpRight size={17} />
            </Link>
          </div>
          <Media
            label="Your next pool day"
            alt="Approved swimming pool photograph pending"
            className="media-lagoon"
          />
        </div>
      </section>

      <section className="container dining-preview section-space">
        <div>
          <p className="eyebrow">SAVE A SEAT</p>
          <h2>
            Good food.
            <br />
            <em>Great company.</em>
          </h2>
          <p>
            Make room for a meal together. Ask the resort about current
            restaurant service and dining arrangements for your visit.
          </p>
          <Link href="/dining/" className="text-link">
            Around the table <ArrowUpRight size={17} />
          </Link>
        </div>
        <Media
          className="media-clay"
          label="Gather at Paraiso"
          alt="Approved restaurant photograph pending"
        />
      </section>

      <section className="home-end container">
        <p className="eyebrow">A DAY TO MAKE YOUR OWN</p>
        <h2>
          Bring your people.
          <br />
          Find your <em>Paraiso.</em>
        </h2>
        <BookingCTA />
        <p className="small-copy">
          Inquiries through the official Facebook page.
          <br />
          The resort confirms all arrangements directly.
        </p>
      </section>
    </>
  );
}
