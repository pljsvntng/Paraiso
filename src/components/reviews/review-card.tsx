import { Quote, Star } from "lucide-react";
import { reviewExcerpt } from "@/lib/reviews";
import type { ReviewCardData } from "@/types/reviews";

export function ReviewCard({ review }: { review: ReviewCardData }) {
  const initials = review.guestName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const date = review.reviewDate
    ? new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${review.reviewDate}T00:00:00Z`))
    : undefined;
  const excerpt = reviewExcerpt(review.message);
  return (
    <article
      className="review-card"
      data-reveal="rise"
      tabIndex={-1}
      aria-label={`Review by ${review.guestName}`}
    >
      <div className="review-card-top">
        <div
          className="review-stars"
          role="img"
          aria-label={`${review.rating} out of 5 stars`}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={17}
              fill={star <= review.rating ? "currentColor" : "none"}
              aria-hidden="true"
            />
          ))}
        </div>
        <Quote
          className="review-quote"
          size={28}
          strokeWidth={1}
          aria-hidden="true"
        />
      </div>
      <blockquote>
        {excerpt ? (
          <details className="review-message">
            <summary>
              <span className="review-excerpt">{excerpt}…</span>
              <span className="review-read-more">
                Read More
                <span className="sr-only">
                  {" "}
                  of {review.guestName}&apos;s review
                </span>
              </span>
              <span className="review-read-less">
                Read Less
                <span className="sr-only">
                  {" "}
                  of {review.guestName}&apos;s review
                </span>
              </span>
            </summary>
            <p className="review-full-message">{review.message}</p>
          </details>
        ) : (
          <p>{review.message}</p>
        )}
      </blockquote>
      <div className="review-guest">
        <span className="review-avatar" aria-hidden="true">
          {initials}
        </span>
        <div>
          <strong>{review.guestName}</strong>
          {(review.visitType || date) && (
            <div className="review-meta">
              {review.visitType && <span>{review.visitType}</span>}
              {date && <time dateTime={review.reviewDate}>{date}</time>}
            </div>
          )}
        </div>
      </div>
      <div className="review-source">
        <span>{review.source}</span>
        {review.originalReviewUrl && (
          <a
            href={review.originalReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Original review
            <span className="sr-only">
              {" "}
              by {review.guestName} on Google Maps (opens in a new tab)
            </span>
          </a>
        )}
      </div>
    </article>
  );
}
