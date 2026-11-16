import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./header";
import { site } from "@/config/site";
import { BookingCTA } from "@/components/shared/BookingCTA";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <p className="eyebrow">SEE YOU AT PARAISO</p>
            <h2>
              Good days begin
              <br />
              with a little escape.
            </h2>
            <BookingCTA variant="link">Let’s plan yours</BookingCTA>
          </div>
          <div className="footer-links">
            <div>
              <span>Make it your day</span>
              <Link href="/accommodations/">Stay a little longer</Link>
              <Link href="/adventures/">Find an adventure</Link>
              <Link href="/pool-cottages/">Pool & cottages</Link>
              <Link href="/dining/">Gather around the table</Link>
            </div>
            <div>
              <span>A few useful things</span>
              <Link href="/contact/">Contact & location</Link>
              <Link href="/packages/">Groups & offers</Link>
              <Link href="/faq/">Good to know</Link>
              <a href={site.facebook} target="_blank" rel="noopener noreferrer">
                Official Facebook <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <Brand />
          <p>
            {site.region} · {site.country}
            <br />
            <small>
              Ask the team for the verified map pin before travelling.
            </small>
          </p>
          <div>
            <Link href="/contact/#privacy">Privacy notice</Link>
            <small>© {new Date().getFullYear()} Paraiso de June Quixote</small>
          </div>
        </div>
      </div>
    </footer>
  );
}
