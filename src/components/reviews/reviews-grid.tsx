"use client";

import { useId, useRef, useState } from "react";
import { filterReviews } from "@/lib/reviews";
import type { ReviewCardData } from "@/types/reviews";
import { ReviewCard } from "./review-card";
import { ReviewsEmpty } from "./reviews-empty";

const pageSize = 6;
export function ReviewsGrid({ items }: { items: ReviewCardData[] }) {
  const id = useId();
  const grid = useRef<HTMLDivElement>(null);
  const [rating, setRating] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [limit, setLimit] = useState(pageSize);
  const categories = [
    ...new Set(
      items.flatMap((item) => (item.visitType ? [item.visitType] : [])),
    ),
  ];
  const filtered = filterReviews(items, rating, category, sort);
  const displayed = filtered.slice(0, limit);
  function reset() {
    setRating("all");
    setCategory("all");
    setSort("newest");
    setLimit(pageSize);
  }
  return (
    <section
      className="container reviews-collection"
      aria-labelledby={`${id}-title`}
    >
      <div className="reviews-collection-heading">
        <h2 id={`${id}-title`}>
          A little time at <em>Paraiso.</em>
        </h2>
        {items.length > 0 && (
          <p role="status" aria-live="polite">
            Showing {displayed.length} of {filtered.length} selected{" "}
            {filtered.length === 1 ? "review" : "reviews"}
          </p>
        )}
      </div>
      {items.length === 0 ? (
        <ReviewsEmpty />
      ) : (
        <>
          <div
            className={`reviews-filters${categories.length ? "" : " no-categories"}`}
            role="group"
            aria-label="Filter and sort selected guest reviews"
          >
            <label htmlFor={`${id}-rating`}>
              Star rating
              <select
                id={`${id}-rating`}
                value={rating}
                onChange={(event) => {
                  setRating(event.target.value);
                  setLimit(pageSize);
                }}
              >
                <option value="all">All ratings</option>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? "star" : "stars"}
                  </option>
                ))}
              </select>
            </label>
            {categories.length > 0 && (
              <label htmlFor={`${id}-category`}>
                Visit type
                <select
                  id={`${id}-category`}
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setLimit(pageSize);
                  }}
                >
                  <option value="all">All visits</option>
                  {categories.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
            )}
            <label htmlFor={`${id}-sort`}>
              Sort by
              <select
                id={`${id}-sort`}
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setLimit(pageSize);
                }}
              >
                <option value="newest">Newest first</option>
                <option value="highest">Highest rated</option>
              </select>
            </label>
            <button type="button" className="review-reset" onClick={reset}>
              Reset filters
            </button>
          </div>
          {displayed.length ? (
            <div ref={grid} className="reviews-grid">
              {displayed.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="reviews-empty">
              <h3>No reviews match just yet.</h3>
              <p>
                Try another star rating or visit type to see more selected
                stories.
              </p>
              <button
                type="button"
                className="button button-outline"
                onClick={reset}
              >
                Clear filters
              </button>
            </div>
          )}
          {limit < filtered.length && (
            <div className="reviews-load-more">
              <button
                type="button"
                className="button button-outline"
                onClick={() => {
                  const firstNew = displayed.length;
                  setLimit((value) => value + pageSize);
                  requestAnimationFrame(() =>
                    (
                      grid.current?.children[firstNew] as
                        HTMLElement | undefined
                    )?.focus(),
                  );
                }}
              >
                Load More Reviews
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
