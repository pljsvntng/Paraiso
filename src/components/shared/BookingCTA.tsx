import { ArrowUpRight } from "lucide-react";
import { getBookingLink, booking, type BookingIntent } from "@/config/booking";
import { Button } from "@/components/ui/button";
type Props = {
  children?: React.ReactNode;
  intent?: BookingIntent;
  className?: string;
  variant?: "default" | "outline" | "light" | "link";
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};
export function BookingCTA({
  children = "Plan your visit",
  intent = "general",
  className,
  variant = "default",
  onClick,
}: Props) {
  const link = getBookingLink(intent);
  return (
    <Button asChild variant={variant} className={className}>
      <a
        href={link.href}
        target={booking.openInNewTab ? "_blank" : undefined}
        rel={booking.openInNewTab ? "noopener noreferrer" : undefined}
        onClick={onClick}
        aria-label={`${typeof children === "string" ? children : "Plan your visit"}${link.isInquiry ? " — inquire on the official Facebook page" : " — open the reservation website"}${booking.openInNewTab ? " (opens in a new tab)" : ""}`}
      >
        {children}
        <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </Button>
  );
}
