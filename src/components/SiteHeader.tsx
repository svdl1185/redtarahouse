"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const closeMobile = () => {
    if (window.matchMedia("(max-width: 768px)").matches) setOpen(false);
  };

  return (
    <header className={`site-header${open ? " is-open" : ""}`}>
      <Link className="brand" href="/" aria-label="Red Tara Sanctuary home">
        Red Tara Sanctuary
      </Link>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="primary-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="nav-toggle-bar" aria-hidden="true" />
        <span className="nav-toggle-bar" aria-hidden="true" />
        <span className="nav-toggle-bar" aria-hidden="true" />
      </button>
      <nav className="nav" id="primary-nav" aria-label="Main navigation">
        <Link href="/book" onClick={closeMobile}>
          Book
        </Link>
        <Link href="/stay" onClick={closeMobile}>
          Stay
        </Link>
      </nav>
    </header>
  );
}
