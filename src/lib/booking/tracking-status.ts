export const trackingStatuses = {
  PENDING_APPROVAL: {
    label: "Pending Approval",
    message: "Your reservation is awaiting confirmation.",
  },
  CONFIRMED: {
    label: "Approved",
    message: "Your reservation has been approved.",
  },
  DECLINED: {
    label: "Declined",
    message: "Your reservation request was declined.",
  },
  CANCELLED: {
    label: "Cancelled",
    message: "Your reservation has been cancelled.",
  },
} as const;
export type TrackingStatus = keyof typeof trackingStatuses;
export type TrackingResult = {
  reference: string;
  status: TrackingStatus;
  message: string;
};

export function displayedReservationReference(row: {
  public_tracking_reference?: string | null;
}) {
  return row.public_tracking_reference || "Tracking reference not issued";
}
