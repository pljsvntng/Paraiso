"use client";
import { useState } from "react";
import { faqs } from "@/data/faq";
export function FaqList() {
  const [category, setCategory] = useState("All questions");
  const [search, setSearch] = useState("");
  const matching = faqs.filter(
    (item) =>
      (category === "All questions" || item.category === category) &&
      `${item.question} ${item.answer}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const groups = [
    "All questions",
    ...new Set(faqs.map((item) => item.category)),
  ];
  return (
    <div className="faq-layout container">
      <div className="faq-filters" aria-label="Filter questions">
        <label className="faq-search" htmlFor="faq-search">
          Find an answer
          <input
            id="faq-search"
            type="search"
            value={search}
            maxLength={120}
            placeholder="Search questions"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
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
      <div className="faq-list">
        <p className="faq-search-summary" role="status">
          {matching.length} {matching.length === 1 ? "answer" : "answers"}
        </p>
        {!matching.length && (
          <div className="editorial-empty">
            <h3>No matching answers yet.</h3>
            <p>
              Try another search or category, or contact the resort for help.
            </p>
            <button
              type="button"
              className="button button-outline"
              onClick={() => {
                setSearch("");
                setCategory("All questions");
              }}
            >
              Clear search and filters
            </button>
          </div>
        )}
        {matching.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
