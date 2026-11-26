"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { FeaturedExperience } from "@/data/featured-experiences";
import { ResponsiveImage } from "@/components/responsive-image";
import { FeaturedBookingAction } from "./featured-booking";

const chapters = ["Stay", "Swim", "Explore", "Dine"];
const imageSizes =
  "(max-width: 700px) calc(100vw - 40px), (max-width: 1050px) calc(100vw - 80px), min(1200px, calc(100vw - 192px))";

export function ExperienceShowcase({
  experiences,
}: {
  experiences: FeaturedExperience[];
}) {
  const [selected, setSelected] = useState(0);
  const [mountedImages, setMountedImages] = useState([0]);
  const [pending, setPending] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const previews = useRef<(HTMLButtonElement | null)[]>([]);
  const loads = useRef(new Map<number, Promise<boolean>>());
  const request = useRef(0);
  const alive = useRef(true);

  const prepareImage = useCallback(
    (index: number) => {
      const current = loads.current.get(index);
      if (current) return current;
      const photo = experiences[index].photo;
      const image = new window.Image();
      image.decoding = "async";
      image.sizes = imageSizes;
      if (photo.srcSet) image.srcset = photo.srcSet;
      image.src = photo.src;
      const ready = image
        .decode()
        .then(() => true)
        .catch(() => {
          loads.current.delete(index);
          return false;
        });
      loads.current.set(index, ready);
      return ready;
    },
    [experiences],
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    let observer: IntersectionObserver | undefined;
    if (
      !connection?.saveData &&
      stage.current &&
      typeof IntersectionObserver !== "undefined"
    ) {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          void prepareImage((selected + 1) % experiences.length);
        },
        { rootMargin: "150px 0px" },
      );
      observer.observe(stage.current);
    }
    return () => observer?.disconnect();
  }, [selected, experiences.length, prepareImage]);

  async function select(index: number) {
    const ticket = ++request.current;
    setMessage("");
    if (index === selected) {
      setPending(null);
      return;
    }
    setPending(index);
    const ready = await prepareImage(index);
    if (!alive.current || ticket !== request.current) return;
    setPending(null);
    if (!ready) {
      setMessage(
        "That photograph could not load. Your current experience is still available. Please try again.",
      );
      return;
    }
    setMountedImages((indices) =>
      indices.includes(index) ? indices : [...indices, index],
    );
    setSelected(index);
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? experiences.length - 1
          : (index +
              (event.key === "ArrowRight" ? 1 : -1) +
              experiences.length) %
            experiences.length;
    previews.current[target]?.focus({ preventScroll: true });
    previews.current[target]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  }

  return (
    <div className="paraiso-showcase">
      <div ref={stage} className="showcase-stage" aria-busy={pending !== null}>
        <div
          className="showcase-photograph"
          data-reveal="fade"
          aria-label="Featured resort photography"
        >
          {experiences.map((experience, index) => {
            return (
              <div
                key={experience.id}
                className="showcase-image"
                data-active={selected === index}
                aria-hidden={selected !== index}
              >
                {/* A decoded native srcset layer avoids a loading overlay covering the outgoing photo. */}
                {mountedImages.includes(index) && (
                  // eslint-disable-next-line @next/next/no-img-element -- decoded crossfade layers using existing optimized srcsets
                  <img
                    src={experience.photo.src}
                    srcSet={experience.photo.srcSet}
                    sizes={imageSizes}
                    width={experience.photo.width}
                    height={experience.photo.height}
                    alt={experience.photo.alt}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: experience.photo.position }}
                  />
                )}
              </div>
            );
          })}
          <p className="showcase-image-counter" aria-hidden="true">
            <span>{String(selected + 1).padStart(2, "0")}</span>
            <span>/</span>
            <span>{String(experiences.length).padStart(2, "0")}</span>
          </p>
        </div>
        <div className="showcase-information" data-reveal="rise">
          <div className="showcase-panel-stack">
            {experiences.map((experience, index) => (
              <div
                key={experience.id}
                id={`${experience.id}-panel`}
                role="tabpanel"
                aria-labelledby={`${experience.id}-tab`}
                aria-hidden={selected !== index}
                inert={selected !== index}
                className="showcase-copy-panel"
                data-active={selected === index}
              >
                <p className="eyebrow">FEATURED / {experience.category}</p>
                <h3>{experience.name}</h3>
                <p className="showcase-description">{experience.description}</p>
                <div className="showcase-actions">
                  <Link
                    href={experience.href}
                    className="button button-primary showcase-explore"
                    aria-label={`Explore Experience — ${experience.name}`}
                  >
                    Explore Experience
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                  <FeaturedBookingAction
                    name={experience.name}
                    intent={experience.intent}
                    category={experience.bookingCategory}
                    names={experience.bookingNames}
                    slugs={experience.bookingSlugs}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="showcase-selector-heading">
        <p className="eyebrow">FIND YOUR KIND OF ESCAPE</p>
        <p>Stay. Swim. Explore. Dine.</p>
      </div>
      <div
        className="showcase-previews"
        role="tablist"
        aria-label="Choose a featured experience"
      >
        {experiences.map((experience, index) => (
          <button
            key={experience.id}
            type="button"
            role="tab"
            data-reveal="rise"
            id={`${experience.id}-tab`}
            aria-controls={`${experience.id}-panel`}
            aria-selected={selected === index}
            aria-busy={pending === index}
            tabIndex={selected === index ? 0 : -1}
            ref={(element) => {
              previews.current[index] = element;
            }}
            onClick={() => void select(index)}
            onKeyDown={(event) => navigate(event, index)}
            onPointerEnter={() => void prepareImage(index)}
            onFocus={() => void prepareImage(index)}
          >
            <span className="showcase-preview-photo">
              <ResponsiveImage src={experience.photo.src} alt="" sizes="72px" />
            </span>
            <span className="showcase-preview-copy">
              <span className="showcase-preview-category">
                0{index + 1} — {chapters[index]}
              </span>
              <span className="showcase-preview-title">{experience.name}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="showcase-feedback" role="status" aria-live="polite">
        {message || (
          <span className="sr-only">
            {chapters[selected]} selected: {experiences[selected].name}.{" "}
            {selected + 1} of {experiences.length}.
          </span>
        )}
      </p>
      <noscript>
        <p className="showcase-noscript">
          Explore Paraiso:{" "}
          {experiences.map((experience) => (
            <Link key={experience.id} href={experience.href}>
              {experience.name}
            </Link>
          ))}
        </p>
      </noscript>
    </div>
  );
}
