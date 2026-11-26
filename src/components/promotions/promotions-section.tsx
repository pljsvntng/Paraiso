import { Reveal } from "@/components/reveal";
import { promotions } from "@/data/promotions";
import { manilaDate } from "@/lib/dates";
import { PromotionCards } from "./promotion-cards";
import "./promotions.css";

export function PromotionsSection() {
  return (
    <section
      id="promotions"
      className="promotions-section section-space"
      aria-labelledby="promotions-title"
    >
      <div className="container">
        <Reveal className="promotions-heading">
          <p className="eyebrow">
            <span className="section-number">03 /</span> THE PARAISO NOTICEBOARD
          </p>
          <h2 id="promotions-title">
            Promotions &amp;
            <br />
            <em>Special Offers</em>
          </h2>
          <p>
            Discover our latest offers, special events, and resort
            announcements.
          </p>
        </Reveal>
        <PromotionCards items={promotions} initialDate={manilaDate()} />
      </div>
    </section>
  );
}
