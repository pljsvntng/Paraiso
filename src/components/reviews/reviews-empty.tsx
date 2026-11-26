import { MessageCircle } from "lucide-react";

export function ReviewsEmpty() {
  return (
    <div className="reviews-empty reviews-awaiting" data-reveal="rise">
      <MessageCircle size={28} strokeWidth={1.2} aria-hidden="true" />
      <p className="eyebrow">A LITTLE TIME. A LASTING MEMORY.</p>
      <h3>
        Your story could be <em>the next one.</em>
      </h3>
      <p>
        Our collection of guest stories is still taking shape. In the meantime,
        explore feedback on Google Maps or share a memory from your visit.
      </p>
      <span className="reviews-empty-caption">
        Selected guest reviews will appear here once approved for sharing.
      </span>
    </div>
  );
}
