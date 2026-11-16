"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { navigation } from "@/config/site";
import { BookingCTA } from "@/components/shared/BookingCTA";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Paraiso de June Quixote home">
      <svg
        className="brand-mark"
        viewBox="0 0 40 48"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 43V12M20 28C5 30 4 15 5 10c13-1 17 7 15 18ZM20 21C33 24 37 11 35 5c-11 0-17 6-15 16Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M20 43c-4-5-9-5-14-5m14 5c4-5 9-5 14-5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      <span>
        <strong>paraiso</strong>
        <small>DE JUNE QUIXOTE</small>
        <em>ECOFARM RESORT</em>
      </span>
    </Link>
  );
}

export function Header() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 30);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  const close = () => {
    dialog.current?.close();
  };
  return (
    <header
      className={`site-header ${path === "/" && !scrolled ? "header-hero" : ""}`}
    >
      <div className="header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path.replace(/\/$/, "") === href.replace(/\/$/, "")
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <BookingCTA className="nav-book" />
        <button
          aria-label="Open navigation menu"
          aria-haspopup="dialog"
          className="menu-toggle"
          onClick={() => dialog.current?.showModal()}
        >
          <Menu />
        </button>
      </div>
      <dialog ref={dialog} className="mobile-menu" aria-label="Main navigation">
        <div className="mobile-menu-top">
          <span className="eyebrow">A LITTLE ESCAPE AWAITS</span>
          <button
            className="menu-toggle"
            aria-label="Close navigation menu"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          {navigation.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              aria-current={
                path.replace(/\/$/, "") === href.replace(/\/$/, "")
                  ? "page"
                  : undefined
              }
            >
              {label}
              <ArrowUpRight size={18} />
            </Link>
          ))}
          <Link href="/packages/" onClick={close}>
            Groups & offers
            <ArrowUpRight size={18} />
          </Link>
        </nav>
        <BookingCTA onClick={close} />
        <p className="small-copy">Inquiries via the official Facebook page.</p>
      </dialog>
    </header>
  );
}
