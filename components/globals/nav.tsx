"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";

const links = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

  return (
    <header className="landing-nav">
      <div className="landing-wrap landing-nav-inner">
        <Link href="/" className="landing-brand" aria-label="Handoff home" onClick={closeMenu}>
          <span className="landing-brand-glyph" aria-hidden="true">h</span>
          <span>Handoff</span>
        </Link>

        <nav className="landing-nav-links hidden md:flex" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
          <Link href="https://github.com/codewithnuh/handoff" target="_blank" rel="noopener noreferrer">
            Open source <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </nav>

        <div className="landing-nav-actions hidden md:flex">
          <Link className="landing-nav-login" href="/login">Log in</Link>
          <Link className="landing-button-primary" href="/register">Get started</Link>
        </div>

        <button
          type="button"
          className="landing-mobile-toggle md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="landing-mobile-menu"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {mobileOpen && (
        <nav id="landing-mobile-menu" className="landing-mobile-menu md:hidden" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeMenu}>{link.label}</Link>
          ))}
          <Link href="https://github.com/codewithnuh/handoff" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
            Open source
          </Link>
          <div className="landing-mobile-actions">
            <Link href="/login" onClick={closeMenu}>Log in</Link>
            <Link className="landing-button-primary" href="/register" onClick={closeMenu}>Get started</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
