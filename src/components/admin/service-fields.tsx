"use client";
import type { Product } from "@/lib/booking/db";
export function ServiceFields({
  product: p,
}: {
  product: Product | undefined;
}) {
  return (
    <>
      <fieldset className="service-config">
        <legend>04 · Informational child rate</legend>
        <label className="field">
          Child rate (PHP, blank uses configured regular rate)
          <input
            name="childPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={p?.child_price ?? ""}
          />
        </label>
      </fieldset>
      <fieldset className="service-config">
        <legend>05 · Amenities, safety & shared facilities</legend>
        <label className="field">
          Verified amenities (one per line)
          <textarea
            name="amenities"
            rows={3}
            defaultValue={p?.amenities.join("\n")}
          />
        </label>
        <label className="field">
          Booking, age and safety restrictions
          <textarea
            name="restrictions"
            maxLength={4000}
            rows={4}
            defaultValue={p?.restrictions}
          />
        </label>
        <div className="reservation-grid">
          <label className="field">
            Session / activity duration (minutes)
            <input
              name="durationMinutes"
              type="number"
              min="1"
              max="1440"
              defaultValue={p?.duration_minutes ?? ""}
            />
          </label>
          <label className="field">
            Equipment capacity (one resource per participant; blank if unused)
            <input
              name="equipmentCount"
              type="number"
              min="1"
              defaultValue={p?.equipment_count ?? ""}
            />
          </label>
          <label className="field">
            Minimum participant age (blank if not configured)
            <input
              name="minAge"
              type="number"
              min="0"
              max="100"
              defaultValue={p?.min_age ?? ""}
            />
          </label>
        </div>
        <label className="field">
          Shared resource group (e.g. actual pool / seating area identifier)
          <input
            name="resourceGroup"
            maxLength={100}
            defaultValue={p?.resource_group}
          />
        </label>
        <p className="small-copy">
          Shared and private offerings using the same actual facility must have
          the same resource group and total guest capacity. Use HH:mm session
          starts plus a duration for overlapping time ranges. A blank session
          occupies the full day. Room-night inventory uses actual room units
          instead.
        </p>
        <label className="checkbox-field">
          <input
            name="exclusive"
            type="checkbox"
            defaultChecked={p?.exclusive}
          />
          <span>
            Exclusive private use: blocks overlapping shared and private
            reservations in the resource group
          </span>
        </label>
        <label className="field">
          Additional authentic photo paths (one per line, /images/...)
          <textarea
            name="photos"
            rows={3}
            defaultValue={p?.photos.join("\n")}
          />
        </label>
      </fieldset>
    </>
  );
}
