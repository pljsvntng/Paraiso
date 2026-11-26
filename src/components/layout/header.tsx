"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { navigation } from "@/config/site";
import { resortLogo, resortLogoOnLight } from "@/config/branding";
import { BookingCTA } from "@/components/shared/booking-cta";

export function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="Paraiso de June Quixote home">
      <Image
        className="brand-mark"
        src={onDark ? resortLogo : resortLogoOnLight}
        alt="Paraiso de June Quixote emblem"
        width={44}
        height={44}
        loading="eager"
        unoptimized
      />
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
  // A solid header remains readable if observer support or hydration is unavailable.
  const [scrolled, setScrolled] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const sentinel = useRef<HTMLSpanElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  // History navigation can change the route while the modal is open.
  useEffect(() => {
    dialog.current?.close();
  }, [path]);
  useEffect(() => {
    if (path !== "/" || !sentinel.current || typeof window.IntersectionObserver !== "function") return;
    let observer: IntersectionObserver | undefined;
    try {
      observer = new IntersectionObserver(([entry]) => {
        setScrolled(!entry.isIntersecting);
      });
      observer.observe(sentinel.current);
    } catch {
      // The solid base header remains usable if enhancement fails.
      observer?.disconnect();
    }
    return () => observer?.disconnect();
  }, [path]);
  const close = () => {
    dialog.current?.close();
    setMenuOpen(false);
  };
  return (
    <>
    <span ref={sentinel} className="header-sentinel" aria-hidden="true" />
    <header
      className={`site-header ${path === "/" && !scrolled ? "header-hero" : ""}`}
    >
      <div className="header-inner">
        <Brand onDark={path === "/" && !scrolled} />
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path.replace(/\/$/, "") === href.replace(/\/$/, "")
                  || (href !== "/" && path.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <BookingCTA className="nav-book">Book now</BookingCTA>
        <button
          ref={menuTrigger}
          aria-label="Open navigation menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="menu-toggle"
          onClick={() => {
            dialog.current?.showModal();
            setMenuOpen(true);
          }}
        >
          <Menu />
        </button>
      </div>
      <dialog
        id="mobile-navigation"
        ref={dialog}
        className="mobile-menu"
        aria-label="Main navigation"
        onClose={() => {
          setMenuOpen(false);
          if (document.activeElement === document.body) menuTrigger.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (
            event.target === event.currentTarget &&
            event.clientX < event.currentTarget.getBoundingClientRect().left
          )
            close();
        }}
      >
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
          {navigation.map(({ label, href }, index) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              style={{ "--menu-index": index } as CSSProperties}
              aria-current={
                path.replace(/\/$/, "") === href.replace(/\/$/, "")
                  || (href !== "/" && path.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              {label}
              <ArrowUpRight size={18} />
            </Link>
          ))}
          <Link href="/packages/" onClick={close} aria-current={path.replace(/\/$/, "") === "/packages" ? "page" : undefined} style={{ "--menu-index": navigation.length } as CSSProperties}>
            Groups & offers
            <ArrowUpRight size={18} />
          </Link>
        </nav>
        <BookingCTA onClick={close} />
        <p className="small-copy">Reserve on our website. Facebook is also available for inquiries.</p>
      </dialog>
    </header>
    </>
  );
}
