import Link from "next/link";
import { ResponsiveImage } from "@/components/responsive-image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { site } from "@/config/site";
import { resortMedia } from "@/config/media";
import { Media } from "@/components/media";
import { Reveal } from "@/components/reveal";
import { BookingCTA } from "@/components/shared/booking-cta";
import { ResortLocation } from "@/components/shared/resort-location";
import { PromotionsSection } from "@/components/promotions/promotions-section";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { faqs } from "@/data/faq";
import { FeaturedExperiences } from "@/components/home/featured-experiences";
import "./home.css";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(site.name, site.description, "/");

export default function Home() {
  const hero = site.heroImage || resortMedia.hero.src;
  return (
    <div className="home-page">
      <section
        className={`hero ${hero ? "hero-with-photo" : ""}`}
        aria-labelledby="hero-title"
      >
        {hero && (
          <div className="hero-visual">
            <ResponsiveImage
              className="hero-photo"
              src={hero}
              alt={site.heroImage ? site.heroAlt : resortMedia.hero.alt}
              priority
              sizes="100vw"
              position={resortMedia.hero.position}
            />
          </div>
        )}
        <div className="hero-shade" />
        <div className="hero-side" aria-hidden="true">
          NATURE’S CALM · ADVENTURE’S THRILL
        </div>
        <div className="container hero-content">
          <p className="eyebrow">PARAISO DE JUNE QUIXOTE ECOFARM RESORT</p>
          <h1 id="hero-title">
            <span className="hero-line">
              <span>A wilder kind</span>
            </span>{" "}
            <span className="hero-line">
              <span>
                of <em>escape.</em>
              </span>
            </span>
          </h1>
          <p className="hero-description">
            Find your calm. Follow your adventurous side.
            <br />
            Make a little time for Paraiso.
          </p>
          <div className="hero-actions">
            <BookingCTA variant="light">Reserve your escape</BookingCTA>
            <a className="button button-ghost" href="#featured-experiences">
              Discover Paraiso <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="container hero-bottom">
          <span>
            MARAGONDON, CAVITE
            <br />
            <small>PHILIPPINES</small>
          </span>
          <a
            href="#your-escape"
            className="hero-scroll"
            aria-label="Scroll to discover Paraiso"
          >
            <ArrowDown size={19} />
          </a>
          <span className="hero-photo-note">
            {hero
              ? "YOUR NEXT CHAPTER, OUTDOORS"
              : "RESORT PHOTOGRAPH TO FOLLOW"}
          </span>
        </div>
      </section>

      <section
        id="your-escape"
        className="container home-story section-space"
        aria-labelledby="story-title"
      >
        <Reveal className="story-copy">
          <div className="story-heading">
            <p className="eyebrow">
              <span className="section-number">01 /</span> WELCOME TO PARAISO
            </p>
            <h2 id="story-title">
              More than
              <br />a <em>getaway.</em>
            </h2>
          </div>
          <div className="story-description">
            <p className="lead-copy">
              A day with a little more fresh air.
              <br />
              And a little less everyday.
            </p>
            <p>
              Bring the family. Round up your friends. In Maragondon, Cavite,
              Paraiso brings the idea of a nature escape and an adventure-filled
              day together.
            </p>
            <Link href="/about/" className="text-link">
              Get to know Paraiso <ArrowUpRight size={17} />
            </Link>
          </div>
        </Reveal>
      </section>

      <FeaturedExperiences />

      <PromotionsSection />

      <section
        className="container home-gathering section-space"
        aria-labelledby="gathering-title"
      >
        <div className="home-gathering-photograph" data-reveal="fade">
          <Media
            asset="facilities"
            alt={resortMedia.facilities.alt}
            label="Garden cabanas at Paraiso"
            sizes="(max-width: 700px) calc(100vw - 40px), 40vw"
          />
        </div>
        <Reveal className="home-gathering-copy">
          <p className="eyebrow">
            <span className="section-number">04 /</span> BETTER, TOGETHER
          </p>
          <h2>
            Bring your people.
            <br />
            <em>We’ll make room.</em>
          </h2>
          <p>
            A family day out. A catch-up with friends. A gathering worth
            planning. Start with your dates and group size, and let the resort
            team help you find the right arrangements.
          </p>
          <div className="home-gathering-actions">
            <Link href="/packages/" className="text-link">
              Plan a gathering <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/gallery/" className="text-link">
              Explore the gallery <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </section>

      <section
        className="container home-faq section-space"
        aria-labelledby="faq-title"
      >
        <div>
          <p className="eyebrow">A LITTLE PLANNING</p>
          <h2 id="faq-title">
            Before
            <br />
            you <em>go.</em>
          </h2>
          <p>A few useful answers for a smoother escape.</p>
          <Link href="/faq/" className="text-link">
            All your questions <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="faq-list">
          {[faqs[1], faqs[0], faqs[3], faqs[4], faqs[2]].map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <ReviewsSection />

      <ResortLocation />

      <section className="home-end container">
        <p className="eyebrow">WE’LL SEE YOU OUT HERE</p>
        <h2>
          Bring your people.
          <br />
          Find your <em>Paraiso.</em>
        </h2>
        <BookingCTA>Reserve your escape</BookingCTA>
        <Link href="/booking/track/" className="home-tracking-link">
          Already booked? Track your reservation{" "}
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        <p className="small-copy">
          Start with an online reservation request, personally reviewed by our
          resort team.
        </p>
      </section>
    </div>
  );
}
