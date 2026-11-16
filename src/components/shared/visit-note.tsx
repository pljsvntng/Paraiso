import { BookingCTA } from "./BookingCTA";
export function VisitNote({
  title = "A little planning goes a long way.",
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <aside className="visit-note container">
      <div>
        <p className="eyebrow">BEFORE YOU SET OFF</p>
        <h2>{title}</h2>
        <p>
          {children ||
            "Tell the resort your preferred date and group size. The team can confirm rates, availability, and the details for your visit."}
        </p>
      </div>
      <BookingCTA variant="outline">Ask the resort</BookingCTA>
    </aside>
  );
}
