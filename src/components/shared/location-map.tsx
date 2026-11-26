"use client";

import { useId, useState } from "react";
import { MapPin } from "lucide-react";

/** The live map starts in preview mode so wheel/touch scrolling stays with the page. */
export function LocationMap({ src, title }: { src: string; title: string }) {
  const [interactive, setInteractive] = useState(false);
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div
      className="location-map"
      data-reveal="fade"
      onKeyDown={event => {
        if (event.key === "Escape") setInteractive(false);
      }}
    >
      <div className="map-toolbar">
        <p id={hintId} aria-live="polite">
          <MapPin size={16} aria-hidden="true" />
          {interactive ? "Drag to pan. Use the map controls to zoom." : "Scroll freely, or explore the map."}
        </p>
        <button
          className="button button-outline map-toggle"
          type="button"
          aria-controls={id}
          aria-pressed={interactive}
          onClick={() => setInteractive(value => !value)}
        >
          {interactive ? "Finish exploring" : "Explore map"}
        </button>
      </div>
      <div className="map-viewport">
        <iframe
          id={id}
          className="map-frame"
          src={src}
          title={title}
          width="1200"
          height="560"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          aria-describedby={hintId}
          tabIndex={interactive ? 0 : -1}
          style={{ pointerEvents: interactive ? "auto" : "none" }}
        />
      </div>
    </div>
  );
}
