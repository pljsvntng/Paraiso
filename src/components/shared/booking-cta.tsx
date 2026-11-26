import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getBookingLink, type BookingIntent } from "@/config/booking";
import { Button } from "@/components/ui/button";
type Props = {
  children?: React.ReactNode;
  intent?: BookingIntent;
  subject?: string;
  className?: string;
  variant?: "default" | "outline" | "light" | "link";
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};
export function BookingCTA({
  children = "Book your visit",
  intent = "general",
  subject,
  className,
  variant = "default",
  onClick,
}: Props) {
  return (
    <Button asChild variant={variant} className={className}>
      <Link
        href={getBookingLink(intent, subject).href}
        onClick={onClick}
        aria-label={
          String(children) +
          " — request a reservation" +
          (subject ? " for " + subject : "")
        }
      >
        {children}
        <ArrowUpRight size={17} aria-hidden="true" />
      </Link>
    </Button>
  );
}
