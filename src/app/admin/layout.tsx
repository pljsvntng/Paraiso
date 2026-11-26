import type { ReactNode } from "react";
import "../booking/reservation.css";
import "./admin.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-area">{children}</div>;
}
