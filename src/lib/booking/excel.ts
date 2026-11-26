import ExcelJS from "exceljs";
import { reservationStatus } from "./request-status";
export const excelHeaders = [
  "Reservation Reference",
  "Guest Name",
  "Contact Number",
  "Email",
  "Reservation Category",
  "Service Name",
  "Visit Date",
  "Check-in Date",
  "Check-out Date",
  "Number of Guests",
  "Special Requests",
  "Reservation Status",
  "Date Submitted",
  "Approved By",
  "Approval Date",
  "Decline Reason",
];
export type ExportBooking = {
  public_tracking_reference?: string | null;
  reference_number: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  booking_category: string;
  product_name: string;
  check_in_date: string;
  check_out_date: string;
  adult_count: number;
  child_count: number;
  status: string;
  workflow_status?: string | null;
  created_at: Date | string;
  special_requests: string;
  overnight?: boolean;
  guest_summary?: string;
  service_categories?: string;
  is_cart?: boolean;
  approved_by?: string | null;
  approval_date?: Date | string | null;
  decline_reason?: string | null;
  itinerary?: {
    name: string;
    category: string;
    overnight: boolean;
    check_in_date: string;
    check_out_date: string;
    slot: string;
    adult_count: number;
    child_count: number;
    special_requests?: string;
  }[];
  total_amount?: number | null;
  reservation_only?: boolean;
};
const stamp = (v: Date | string) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
export function excelValues(b: ExportBooking) {
  const items = b.itinerary || [];
  return [
    b.reference_number,
    b.guest_name,
    b.guest_phone,
    b.guest_email,
    b.service_categories || b.booking_category,
    items.length ? items.map((i) => i.name).join("; ") : b.product_name,
    items.length
      ? items
          .map(
            (i) =>
              i.name + ": " + i.check_in_date + (i.slot ? " " + i.slot : ""),
          )
          .join("; ")
      : b.check_in_date,
    items.length
      ? items
          .filter((i) => i.overnight)
          .map((i) => i.check_in_date)
          .join("; ")
      : b.overnight
        ? b.check_in_date
        : "",
    items.length
      ? items
          .filter((i) => i.overnight)
          .map((i) => i.check_out_date)
          .join("; ")
      : b.overnight
        ? b.check_out_date
        : "",
    b.guest_summary || b.adult_count + b.child_count,
    [b.special_requests, ...items.map((i) => i.special_requests || "")]
      .filter(Boolean)
      .join("; "),
    reservationStatus(b),
    stamp(b.created_at),
    b.approved_by || "",
    b.approval_date ? stamp(b.approval_date) : "",
    b.decline_reason || "",
  ];
}
export async function exportWorkbook(bookings: ExportBooking[]) {
  const book = new ExcelJS.Workbook();
  book.creator = "Paraiso de June Quixote";
  const sheet = book.addWorksheet("Reservations", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.addRow(excelHeaders);
  for (const b of bookings) sheet.addRow(excelValues(b));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF193F32" },
  };
  sheet.columns.forEach((c, i) => (c.width = [5, 10].includes(i) ? 48 : 25));
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, sheet.rowCount), column: excelHeaders.length },
  };
  return book.xlsx.writeBuffer();
}
