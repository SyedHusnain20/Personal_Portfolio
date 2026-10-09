"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "@/lib/content";

declare global {
  interface Window {
    __setShaderTheme?: (theme: string) => void;
  }
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  // Theme state mirrors <html data-theme>, which the inline script set before first paint.
  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setDark(next === "dark");
    window.__setShaderTheme?.(next);
  };

  // Sticky header state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    NAV_LINKS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    menuBtn.current?.focus();
  }, []);

  // Mobile menu: lock scroll, make the page behind it inert, close on Escape
  useEffect(() => {
    if (!open) return;
    const regions = [document.getElementById("main"), document.querySelector("footer")] as (HTMLElement | null)[];
    document.body.style.overflow = "hidden";
    regions.forEach((el) => {
      if (!el) return;
      el.setAttribute("aria-hidden", "true");
      el.inert = true;
    });
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMenu();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      regions.forEach((el) => {
        if (!el) return;
        el.removeAttribute("aria-hidden");
        el.inert = false;
      });
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeMenu]);

  return (
    <>
      <header className={`site-header${scrolled ? " scrolled" : ""}`} id="siteHeader">
        <nav className="nav" aria-label="Primary navigation">
          <a className="brand" href="#main">
            Hasnain<em>.</em>
          </a>
          <div className="nav-links">
            {NAV_LINKS.map(([id, label]) => (
              <a href={`#${id}`} key={id} className={active === id ? "active" : undefined}>
                {label}
              </a>
            ))}
          </div>
          <div className="nav-end">
            <button className="theme-toggle" type="button" aria-label="Toggle dark mode" aria-pressed={dark} onClick={toggleTheme}>
              <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
              </svg>
            </button>
            <a className="btn primary small magnetic" href="#contact">
              Start a project
            </a>
            <button
              ref={menuBtn}
              className={`hamburger${open ? " open" : ""}`}
              id="menuBtn"
              aria-label="Navigation menu"
              aria-expanded={open}
              aria-controls="mobileNav"
              onClick={() => (open ? closeMenu() : setOpen(true))}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </nav>
      </header>

      <nav className={`mobile-nav${open ? " open" : ""}`} id="mobileNav" aria-label="Mobile navigation">
        {NAV_LINKS.map(([id, label], i) => (
          <a
            href={`#${id}`}
            key={id}
            ref={i === 0 ? firstLink : undefined}
            className="mobile-nav-link"
            onClick={() => setOpen(false)}
          >
            {label}
          </a>
        ))}
        <a href="#contact" className="mobile-nav-link mobile-nav-cta" onClick={() => setOpen(false)}>
          Start a project
        </a>
      </nav>
    </>
  );
}
