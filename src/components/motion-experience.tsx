"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Existing markup stays server-rendered and readable; motion is an optional enhancement.
const rise = [
  "[data-reveal]",
  ".section-heading",
  ".pool-copy",
  ".adventure-notes",
  ".dining-preview > div:not(.media)",
  ".intro-grid > div",
  ".about-body > div",
  ".info-split > div:not(.media)",
  ".pool-banner .container > div:not(.media)",
  ".location-copy",
  ".home-faq > div:first-child",
  ".home-end",
  ".editorial-quote",
  ".visit-note > div",
  ".footer-top",
  ".story-introduction",
  ".experience-row",
  ".photo-collection-grid > figure",
  ".promotion-card",
  ".chapter-copy",
  ".accommodation-hero-copy",
  ".accommodation-list-intro",
  ".promotions-heading",
].join(", ");
const fade = [
  ".story-image .media",
  ".full-media .media",
  ".pool-grid .media",
  ".pool-banner .media",
  ".dining-feature .media",
  ".dining-preview .media",
  ".info-split .media",
  ".adventure-feature .media",
  ".adventure-support > .media",
  ".stay-image .media",
  ".expansion-frame",
  ".gallery-item",
  ".contact-grid > section",
  ".hero-content > .eyebrow",
  ".hero-description",
  ".hero-actions > *",
].join(", ");
const masks = ".hero-line > span";
const curtains = ".expansion-frame, .dining-feature .media";
const targets = `${rise}, ${fade}, ${masks}`;
const revealClasses = [
  "reveal-rise",
  "reveal-fade",
  "reveal-mask",
  "reveal-image",
];

export function MotionExperience() {
  const pathname = usePathname();
  // Only completed entrances persist across effect cleanup. Strict Mode can retry canceled ones.
  const completed = useRef(new WeakSet<Element>());
  const previousPath = useRef(pathname);
  const restoringHistory = useRef(false);

  useEffect(() => {
    const restore = () => {
      restoringHistory.current =
        window.location.pathname.replace(/\/$/, "") !==
        previousPath.current.replace(/\/$/, "");
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    let mutations: MutationObserver | undefined;
    const active = new Set<HTMLElement>();
    const routeChanged = previousPath.current !== pathname;
    previousPath.current = pathname;
    const history = restoringHistory.current;
    restoringHistory.current = false;
    let pageEntrance: Animation | undefined;

    // Focus committed content without scrolling; Link and history retain native restoration.
    function enterPage() {
      if (!routeChanged || history) return;
      const main = document.getElementById("main");
      main?.focus({ preventScroll: true });
      if (reduced.matches) return;
      if (main && typeof main.animate === "function") {
        const tokens = getComputedStyle(document.documentElement);
        // Production CSS may normalize 400ms to .4s; Web Animations expects milliseconds.
        const duration = tokens.getPropertyValue("--motion-page").trim();
        pageEntrance = main.animate([{ opacity: 0.88 }, { opacity: 1 }], {
          duration:
            parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000) || 400,
          easing: tokens.getPropertyValue("--motion-ease").trim() || "ease-out",
        });
      }
    }

    function clear(el: HTMLElement, remember = false) {
      if (remember) completed.current.add(el);
      active.delete(el);
      el.classList.remove(...revealClasses);
      el.style.removeProperty("--reveal-delay");
    }

    function finish(event: AnimationEvent) {
      if (!revealClasses.includes(event.animationName)) return;
      if (event.target instanceof HTMLElement && active.has(event.target))
        clear(event.target, true);
    }

    function focus(event: FocusEvent) {
      if (!(event.target instanceof Node)) return;
      for (const el of active) {
        if (el.contains(event.target)) clear(el, true);
      }
    }

    function stop(remember = false) {
      observer?.disconnect();
      mutations?.disconnect();
      for (const el of active) clear(el, remember);
      pageEntrance?.cancel();
    }

    function setup() {
      stop(reduced.matches);
      // Hardware/memory/Data Saver hints do not imply a request to remove motion.
      if (reduced.matches || typeof window.IntersectionObserver !== "function")
        return;

      function discover(root: ParentNode) {
        const candidates =
          root instanceof HTMLElement && root.matches(targets)
            ? [root, ...root.querySelectorAll<HTMLElement>(targets)]
            : [...root.querySelectorAll<HTMLElement>(targets)];
        for (const el of candidates) {
          if (
            completed.current.has(el) ||
            active.has(el) ||
            el.closest("dialog") ||
            el.parentElement?.closest(targets)
          )
            continue;
          // A route fade already covers its first viewport. History must restore immediately.
          if (
            (routeChanged || history) &&
            el.getBoundingClientRect().top < window.innerHeight
          ) {
            completed.current.add(el);
            continue;
          }
          observer?.observe(el);
        }
      }

      try {
        observer = new IntersectionObserver(
          (entries) => {
            // Nearby siblings get a bounded 90ms stagger, never a long page-wide queue.
            const groups = new Map<Element, number>();
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const el = entry.target as HTMLElement;
              observer?.unobserve(el);
              if (!el.isConnected) continue;
              if (completed.current.has(el) || active.has(el)) continue;
              if (el.contains(document.activeElement)) {
                completed.current.add(el);
                continue;
              }
              const heroGroup = el.closest(".hero-content");
              const group = heroGroup || el.parentElement || el;
              const index = groups.get(group) || 0;
              groups.set(group, index + 1);
              const heroOrder = heroGroup
                ? [...heroGroup.querySelectorAll<HTMLElement>(targets)].indexOf(
                    el,
                  )
                : -1;
              el.style.setProperty(
                "--reveal-delay",
                `${Math.min(heroOrder >= 0 ? heroOrder : index, heroGroup ? 5 : 3) * 90}ms`,
              );
              active.add(el);
              el.classList.add(
                el.matches(masks)
                  ? "reveal-mask"
                  : el.matches(curtains)
                    ? "reveal-image"
                    : el.matches(fade) || el.dataset.reveal === "fade"
                      ? "reveal-fade"
                      : "reveal-rise",
              );
            }
          },
          { threshold: 0, rootMargin: "0px 0px -32px 0px" },
        );
        discover(document);

        // Only watch direct gallery/review insertions, rather than rescanning the whole page.
        if (typeof window.MutationObserver === "function") {
          mutations = new MutationObserver((records) => {
            for (const record of records) {
              for (const node of record.removedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                observer?.unobserve(node);
                node
                  .querySelectorAll(targets)
                  .forEach((el) => observer?.unobserve(el));
                for (const el of active) {
                  if (node.contains(el)) clear(el, true);
                }
              }
              for (const node of record.addedNodes) {
                if (node instanceof HTMLElement) discover(node);
              }
            }
          });
          document
            .querySelectorAll(".gallery-grid, .reviews-grid")
            .forEach((grid) => {
              mutations?.observe(grid, { childList: true });
            });
        }
      } catch {
        // Failed enhancement leaves the original visible HTML and working controls.
        stop();
      }
    }

    document.addEventListener("animationend", finish);
    document.addEventListener("focusin", focus);
    setup();
    enterPage();
    reduced.addEventListener("change", setup);
    return () => {
      stop();
      reduced.removeEventListener("change", setup);
      document.removeEventListener("animationend", finish);
      document.removeEventListener("focusin", focus);
    };
  }, [pathname]);

  return null;
}
