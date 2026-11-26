"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Shared native scroll/snap behavior. No autoplay, wheel capture or animation loop. */
export function useScrollCarousel(count: number, columnsVariable: string) {
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    active: 0,
    visible: Math.min(3, count),
  });
  const maxIndex = Math.max(0, count - position.visible);
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const visible = Math.min(
      count,
      Number(getComputedStyle(el).getPropertyValue(columnsVariable)) || 1,
    );
    const children = el.children;
    const step =
      children.length > 1
        ? (children[1] as HTMLElement).offsetLeft -
          (children[0] as HTMLElement).offsetLeft
        : el.clientWidth;
    const active = Math.max(
      0,
      Math.min(count - visible, Math.round(el.scrollLeft / Math.max(1, step))),
    );
    setPosition((previous) =>
      previous.active === active && previous.visible === visible
        ? previous
        : { active, visible },
    );
  }, [count, columnsVariable]);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    if (typeof ResizeObserver !== "function") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);
  function goTo(index: number) {
    const el = track.current;
    const first = el?.children[0] as HTMLElement | undefined;
    const card = el?.children[Math.max(0, Math.min(maxIndex, index))] as
      HTMLElement | undefined;
    if (el && card && first)
      el.scrollTo({
        left: card.offsetLeft - first.offsetLeft,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  return { track, position, maxIndex, measure, goTo };
}
