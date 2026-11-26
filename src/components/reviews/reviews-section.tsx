import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { getApprovedReviews } from "@/data/reviews";
import { ReviewCarousel } from "./review-carousel";
import { GoogleReviewActions } from "./google-review-actions";
import { ReviewsEmpty } from "./reviews-empty";
import "./reviews.css";

export function ReviewsSection() {
  const items = getApprovedReviews();
  return (
    <section
      id="guest-reviews"
      className="reviews-section section-space"
      aria-labelledby="guest-reviews-title"
    >
      <div className="container">
        <Reveal className="reviews-heading">
          <p className="eyebrow">THE MEMORIES WE TAKE HOME</p>
          <h2 id="guest-reviews-title">
            What Our <em>Guests Say</em>
          </h2>
          <p>
            Every visit tells a story. Discover the beautiful memories and
            unforgettable experiences shared by our guests at Paraiso de June
            Quixote Ecofarm and Resort.
          </p>
        </Reveal>
        {items.length ? (
          <ReviewCarousel items={items.slice(0, 6)} />
        ) : (
          <ReviewsEmpty />
        )}
        <p className="reviews-selection-note">
          Guest reviews are selected with permission and maintained by our team.
          This is not a live Google review feed.
        </p>
        <GoogleReviewActions />
        <div className="reviews-section-actions">
          <Link href="/guest-reviews/" className="text-link">
            Explore All Guest Reviews
          </Link>
        </div>
      </div>
    </section>
  );
}
