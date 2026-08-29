"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";

import { Container } from "./container";
import { Button } from "../ui/button";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
] as const;

export const Navbar = () => {
  const { scrollY } = useScroll();

  // Navbar gets slightly more compact as you scroll.
  const py = useTransform(scrollY, [0, 100], ["1.25rem", "0.75rem"]);

  // Subtle horizontal movement like your reference navbar.
  const leftOffset = useTransform(scrollY, [0, 100], [0, 16]);
  const rightOffset = useTransform(scrollY, [0, 100], [0, -16]);

  // Border fades in after scrolling.
  const borderOpacity = useTransform(scrollY, [0, 40], [0, 1]);

  return (
    <motion.header
      style={{
        paddingTop: py,
        paddingBottom: py,
      }}
      className="sticky top-0 z-50 w-full border-b border-transparent bg-background/70 backdrop-blur-md"
    >
      {/* Scroll border */}
      <motion.div
        style={{ opacity: borderOpacity }}
        className="absolute inset-x-0 bottom-0 h-px bg-border"
      />

      <Container>
        <nav
          aria-label="Main navigation"
          className="flex min-w-0 items-center justify-between"
        >
          {/* Brand */}
          <motion.div className="shrink-0" style={{ x: leftOffset }}>
            <Link
              href="/"
              className="flex items-center gap-0.5 text-foreground transition-opacity hover:opacity-80"
              aria-label="Handoff home"
            >
              <Image
                src="/logo.png"
                width={32}
                height={32}
                alt=""
                aria-hidden="true"
                className="size-8 object-contain"
                priority
              />

              <span className="font-heading text-xl font-semibold leading-none tracking-[-0.025em]">
                Handoff
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.div
            className="hidden items-center gap-1 md:flex"
            style={{ x: rightOffset }}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </motion.div>

          {/* Actions */}
          <motion.div
            className="flex items-center gap-2"
            style={{ x: rightOffset }}
          >
            <Button
              render={<Link href="/login">Log in</Link>}
              variant="ghost"
            />

            <Button render={<Link href="/register">Get started</Link>} />
          </motion.div>
        </nav>
      </Container>
    </motion.header>
  );
};
