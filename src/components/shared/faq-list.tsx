"use client";
import { useState } from "react";
import { faqs } from "@/data/faq";
export function FaqList() {
  const [category, setCategory] = useState("All questions");
  const groups = ["All questions", "Planning", "Experiences", "Reservations"];
  return (
    <div className="faq-layout container">
      <div className="faq-filters" aria-label="Filter questions">
        {groups.map((group) => (
          <button
            key={group}
            aria-pressed={group === category}
            onClick={() => setCategory(group)}
          >
            {group}
          </button>
        ))}
      </div>
      <div className="faq-list" aria-live="polite">
        {faqs
          .filter(
            (item) =>
              category === "All questions" || item.category === category,
          )
          .map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
      </div>
    </div>
  );
}
