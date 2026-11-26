import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { Brand } from "./header";
import { site } from "@/config/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Brand onDark />
            <p>
              A little closer to nature.
              <br />A little further from the everyday.
            </p>
            <span className="eyebrow">MARAGONDON, CAVITE · PHILIPPINES</span>
          </div>
          <div className="footer-links">
            <div>
              <span>Find your escape</span>
              <Link href="/about/">About Paraiso</Link>
              <Link href="/adventures/">Adventures</Link>
              <Link href="/accommodations/">Accommodations</Link>
              <Link href="/pool-cottages/">Swimming & cottages</Link>
              <Link href="/dining/">Dining</Link>
            </div>
            <div>
              <span>Plan your visit</span>
              <Link href="/booking/">Book your visit</Link>
              <Link href="/gallery/">Photo gallery</Link>
              <Link href="/guest-reviews/">Guest reviews</Link>
              <Link href="/packages/">Groups & offers</Link>
              <Link href="/faq/">Frequently asked questions</Link>
              <Link href="/contact/">Contact & location</Link>
              <a href={site.facebook} target="_blank" rel="noopener noreferrer">
                Official Facebook <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
          <div className="footer-contact">
            <p className="eyebrow">LET’S MAKE A PLAN</p>
            <p>
              Your next good day
              <br />
              starts with hello.
            </p>
            <a
              className="text-link"
              href={site.facebook}
              target="_blank"
              rel="noopener noreferrer"
            >
              Talk to the resort <ArrowUpRight size={17} />
            </a>
            <small>
              Ask for current rates, activity schedules,
              <br />
              and arrival guidance.
            </small>
          </div>
        </div>
        <div className="footer-bottom">
          <small>
            © {new Date().getFullYear()} {site.name}
          </small>
          <span>Nature’s calm. Adventure’s thrill.</span>
          <Link href="/policies/privacy/">Privacy</Link>
          <Link href="/policies/terms/">Terms</Link>
          <Link href="/policies/cancellation/">Cancellation & refunds</Link>
          <Link href="/policies/rescheduling/">Rescheduling</Link>
          <a href="#main" className="back-to-top">Back to top <ArrowUp size={15} aria-hidden="true" /></a>
        </div>
      </div>
    </footer>
  );
}
