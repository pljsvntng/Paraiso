"use client";
import Link from "next/link";
export default function DashboardError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <section className="admin-recovery" role="alert">
      <p className="workspace-eyebrow">PARAISO · RESORT MANAGEMENT</p>
      <h1>Unable to display the dashboard</h1>
      <p>
        Please retry. If the problem continues, sign in again or contact your
        administrator.
      </p>
      <div className="drawer-quick-actions">
        <button className="reservation-button" onClick={retry}>
          Retry dashboard
        </button>
        <Link className="admin-action" href="/admin/login/">
          Return to sign in
        </Link>
      </div>
    </section>
  );
}
