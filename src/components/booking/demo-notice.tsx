"use client";
import { useEffect, useState } from "react";
export function DemoNotice() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/reservations/demo-mode/", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        if (r?.demoMode) {
          setDemo(true);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return demo ? (
    <>
      <aside className="demo-mode-banner" role="status">
        <strong>DEMO MODE — Sample information for presentation only</strong>
        <span>
          Illustrative prices, capacities and schedules. Use fictitious DEMO
          guests and @example.test emails. No real booking, payment or email
          delivery.
        </span>
      </aside>
    </>
  ) : null;
}
