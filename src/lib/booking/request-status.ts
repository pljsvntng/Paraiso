export function requestStatusMessage(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "Your reservation has been approved. We look forward to welcoming you!";
    case "DECLINED":
      return "Your reservation request could not be approved. Please review the resort's response.";
    case "CANCELLED":
      return "This reservation has been cancelled.";
    case "CHECKED_IN":
      return "Welcome to Paraiso! Your visit is in progress.";
    case "CHECKED_OUT":
    case "COMPLETED":
      return "Your visit is complete. Thank you for choosing Paraiso!";
    default:
      return "Your reservation request is currently being reviewed by our resort staff.";
  }
}

export function reservationStatus(b: {
  status: string;
  workflow_status?: string | null;
}) {
  if (["CHECKED_IN", "CHECKED_OUT"].includes(b.status)) return b.status;
  const state = b.workflow_status || b.status;
  if (state === "EXPIRED") return "CANCELLED";
  return ["PENDING", "PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(state)
    ? "PENDING_APPROVAL"
    : state;
}
