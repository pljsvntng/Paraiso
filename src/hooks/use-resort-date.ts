"use client";
import { useSyncExternalStore } from "react";
import { manilaDate } from "@/lib/dates";

function subscribe(callback: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  function refresh() {
    clearTimeout(timer);
    callback();
    if (!document.hidden) {
      const midnight =
        Date.parse(`${manilaDate()}T00:00:00+08:00`) + 86_400_000;
      timer = setTimeout(refresh, Math.max(1000, midnight - Date.now() + 50));
    }
  }
  refresh();
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}
export function useResortDate(initialDate: string) {
  return useSyncExternalStore(subscribe, manilaDate, () => initialDate);
}
