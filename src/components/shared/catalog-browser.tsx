"use client";

import { useId, useState, useEffect, type ReactNode } from "react";
import { loadPublicCatalog } from "@/components/booking/public-services";
import type { Product } from "@/lib/booking/db";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  emptyCatalogFilters,
  filterCatalog,
  type CatalogEntry,
} from "@/lib/catalog";

type Item = CatalogEntry & { content: ReactNode };
export function CatalogBrowser({
  items,
  label,
  className = "",
  commercialCategory,
}: {
  items: Item[];
  label: string;
  className?: string;
  commercialCategory?: string;
}) {
  const id = useId();
  const [filters, setFilters] = useState(emptyCatalogFilters);
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (!commercialCategory) return;
    let active = true;
    const load = () =>
      loadPublicCatalog()
        .then((r) => {
          if (active) setProducts(r.products);
        })
        .catch(() => {});
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [commercialCategory]);
  const entries = commercialCategory
    ? items.map((item) => {
        const p = products.find(
          (p) => p.slug === item.id && p.category === commercialCategory,
        );
        return {
          ...item,
          capacity: p?.max_guests ?? undefined,
          price: p?.price ?? undefined,
          amenities: p?.amenities || [],
        };
      })
    : items;
  const categories = [...new Set(items.map((item) => item.category))];
  const hasCapacity = entries.some((item) => item.capacity !== undefined);
  const hasPrice = entries.some((item) => item.price !== undefined);
  const amenities = [
    ...new Set(entries.flatMap((item) => item.amenities || [])),
  ];
  const filtered = filterCatalog(entries, filters);
  const visible = new Set(filtered.map((item) => item.id));
  const active = Object.values(filters).some(Boolean);
  function update(key: keyof typeof filters, value: string) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }
  return (
    <>
      <div
        className="catalog-toolbar"
        role="search"
        aria-label={`Find ${label}`}
      >
        <label className="catalog-search" htmlFor={`${id}-search`}>
          <span>Find your {label === "stays" ? "stay" : "experience"}</span>
          <span className="catalog-input">
            <Search size={17} aria-hidden="true" />
            <input
              id={`${id}-search`}
              type="search"
              placeholder={`Search ${label}`}
              value={filters.query}
              maxLength={120}
              onChange={(event) => update("query", event.target.value)}
            />
          </span>
        </label>
        {categories.length > 1 && (
          <label htmlFor={`${id}-type`}>
            <span>Category</span>
            <select
              id={`${id}-type`}
              value={filters.category}
              onChange={(event) => update("category", event.target.value)}
            >
              <option value="">All {label}</option>
              {categories.map((category) => (
                <option value={category} key={category}>
                  {category.charAt(0) + category.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        )}
        {hasCapacity && (
          <label htmlFor={`${id}-guests`}>
            <span>Guests</span>
            <input
              id={`${id}-guests`}
              type="number"
              min="1"
              step="1"
              value={filters.guests}
              onChange={(event) => update("guests", event.target.value)}
            />
          </label>
        )}
        {hasPrice && (
          <label htmlFor={`${id}-price`}>
            <span>Maximum rate (PHP)</span>
            <input
              id={`${id}-price`}
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={(event) => update("maxPrice", event.target.value)}
            />
          </label>
        )}
        {amenities.length > 1 && (
          <label htmlFor={`${id}-amenity`}>
            <span>Amenity</span>
            <select
              id={`${id}-amenity`}
              value={filters.amenity}
              onChange={(event) => update("amenity", event.target.value)}
            >
              <option value="">Any verified amenity</option>
              {amenities.map((amenity) => (
                <option key={amenity}>{amenity}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="catalog-summary">
        <p role="status">
          <SlidersHorizontal size={14} aria-hidden="true" /> {filtered.length}{" "}
          of {items.length} {label}
        </p>
        {active && (
          <button
            type="button"
            className="text-link"
            onClick={() => setFilters(emptyCatalogFilters)}
          >
            Clear filters <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className={`catalog-results ${className}`}>
        {items.map((item) => (
          <div
            key={item.id}
            hidden={!visible.has(item.id)}
            className="catalog-result"
          >
            {item.content}
          </div>
        ))}
      </div>
      {!filtered.length && (
        <div className="editorial-empty catalog-empty">
          <h3>A different search, perhaps?</h3>
          <p>
            No {label} match those choices. Clear your filters to explore the
            full collection.
          </p>
          <button
            className="button button-outline"
            type="button"
            onClick={() => setFilters(emptyCatalogFilters)}
          >
            Show all {label}
          </button>
        </div>
      )}
    </>
  );
}
