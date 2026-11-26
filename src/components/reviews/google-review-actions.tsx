import {
  googleReviewsConfig,
  getWriteReviewLink,
} from "@/config/google-reviews";

export function GoogleReviewActions() {
  const write = getWriteReviewLink();
  return (
    <div className="google-review-actions">
      <div className="google-review-buttons">
        <a
          className="button button-outline"
          href={googleReviewsConfig.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View All Reviews on Google
          <span className="sr-only">
            {" "}
            (opens the resort’s Google Maps listing in a new tab)
          </span>
        </a>
        <a
          className="button button-primary"
          href={write.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          Write a Google Review
          <span className="sr-only"> (opens Google in a new tab)</span>
        </a>
      </div>
      <p className="google-review-note">
        {write.isDirect ? (
          "Continue to Google to sign in and write your review."
        ) : (
          <>
            Continue to our Google Maps listing, then choose{" "}
            <strong>Write a review</strong>.
          </>
        )}{" "}
        Google handles sign-in and saves your review.
      </p>
    </div>
  );
}
