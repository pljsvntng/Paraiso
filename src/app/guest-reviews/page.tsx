import { MessageCircle } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { GoogleReviewActions } from "@/components/reviews/google-review-actions";
import { ReviewsGrid } from "@/components/reviews/reviews-grid";
import { getApprovedReviews } from "@/data/reviews";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/metadata";
import "@/components/reviews/reviews.css";

export const metadata = pageMetadata(
  "Guest Reviews",
  "Selected guest stories from Paraiso de June Quixote Ecofarm and Resort. Read testimonials and share your experience directly on Google Maps.",
  "/guest-reviews/",
);

export default function GuestReviewsPage() {
  const items = getApprovedReviews();
  return (
    <>
      <div className="reviews-page-header">
        <PageIntro
          eyebrow="GUEST REVIEWS"
          title={
            <>
              What Our
              <br />
              <em>Guests Say</em>
            </>
          }
          description="Every visit tells a story. Discover the beautiful memories and unforgettable experiences shared by our guests at Paraiso de June Quixote Ecofarm and Resort."
        >
          <p className="reviews-moderation-note">
            Selected with permission, approved for sharing, and maintained by
            our team. Reviews on this website are not automatically synchronized
            with Google.
          </p>
        </PageIntro>
      </div>
      <ReviewsGrid items={items} />
      <div className="container reviews-page-actions">
        <GoogleReviewActions />
      </div>
      <section
        className="container reviews-facebook"
        aria-labelledby="reviews-facebook-title"
      >
        <MessageCircle size={28} strokeWidth={1.1} aria-hidden="true" />
        <div>
          <p className="eyebrow">KEEP THE CONVERSATION GOING</p>
          <h2 id="reviews-facebook-title">
            More moments. <em>More connection.</em>
          </h2>
          <p>
            Stay connected with the resort for community updates and more
            moments from Paraiso.
          </p>
        </div>
        <a
          className="button button-outline"
          href={site.facebook}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit Our Facebook Page
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </section>
    </>
  );
}
