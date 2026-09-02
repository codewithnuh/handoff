"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import {
  IconBrandGithub,
  IconMenu2,
  IconX,
  IconChevronDown,
} from "@tabler/icons-react";

import { Container } from "./container";
import { Button } from "../ui/button";

const NAV_GROUPS = [
  {
    label: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Security", href: "/security" },
    ],
  },
] as const;

const GITHUB_URL = "https://github.com/codewithnuh/handoff";

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollY } = useScroll();

  // Navbar becomes slightly more compact while scrolling.
  const py = useTransform(scrollY, [0, 100], ["1.25rem", "0.75rem"]);

  // Subtle movement from the original design.
  const leftOffset = useTransform(scrollY, [0, 100], [0, 16]);
  const rightOffset = useTransform(scrollY, [0, 100], [0, -16]);

  // Border appears after scrolling.
  const borderOpacity = useTransform(scrollY, [0, 40], [0, 1]);

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <motion.header
      style={{
        paddingTop: py,
        paddingBottom: py,
      }}
      className="sticky top-0 z-50 w-full border-b border-transparent bg-background/80 backdrop-blur-xl"
    >
      {/* Scroll border */}
      <motion.div
        style={{ opacity: borderOpacity }}
        className="absolute inset-x-0 bottom-0 h-px bg-border"
      />

      <Container>
        <nav
          aria-label="Main navigation"
          className="relative flex min-w-0 items-center justify-between"
        >
          {/* Brand */}
          <motion.div className="shrink-0" style={{ x: leftOffset }}>
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="flex items-center gap-1 text-foreground transition-opacity hover:opacity-80"
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
            {/* Product */}
            <div className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Product
                <IconChevronDown
                  size={14}
                  stroke={1.8}
                  className="transition-transform group-hover:rotate-180"
                />
              </button>

              <div className="invisible absolute left-1/2 top-full w-48 -translate-x-1/2 translate-y-2 rounded-xl border bg-popover p-1.5 opacity-0 shadow-lg transition-all group-hover:visible group-hover:translate-y-1 group-hover:opacity-100">
                {NAV_GROUPS[0].links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Company */}
            <div className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Company
                <IconChevronDown
                  size={14}
                  stroke={1.8}
                  className="transition-transform group-hover:rotate-180"
                />
              </button>

              <div className="invisible absolute left-1/2 top-full w-40 -translate-x-1/2 translate-y-2 rounded-xl border bg-popover p-1.5 opacity-0 shadow-lg transition-all group-hover:visible group-hover:translate-y-1 group-hover:opacity-100">
                {NAV_GROUPS[1].links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Open Source */}
            <Link
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="View Handoff source code on GitHub"
            >
              <IconBrandGithub size={17} stroke={1.8} />
              <span>Open source</span>
            </Link>
          </motion.div>

          {/* Desktop Actions */}
          <motion.div
            className="hidden items-center gap-2 md:flex"
            style={{ x: rightOffset }}
          >
            <Button
              render={<Link href="/login">Log in</Link>}
              variant="ghost"
              nativeButton={false}
            />

            <Button
              nativeButton={false}
              render={<Link href="/register">Get started</Link>}
            />
          </motion.div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            {mobileOpen ? (
              <IconX size={21} stroke={1.8} />
            ) : (
              <IconMenu2 size={21} stroke={1.8} />
            )}
          </button>
        </nav>

        {/* Mobile Navigation */}
        <motion.div
          initial={false}
          animate={
            mobileOpen
              ? {
                  height: "auto",
                  opacity: 1,
                  marginTop: 16,
                }
              : {
                  height: 0,
                  opacity: 0,
                  marginTop: 0,
                }
          }
          transition={{ duration: 0.2 }}
          className="overflow-hidden md:hidden"
        >
          <div className="border-t py-4">
            <div className="space-y-1">
              {/* Product */}
              <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Product
              </div>

              {NAV_GROUPS[0].links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}

              {/* Company */}
              <div className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company
              </div>

              {NAV_GROUPS[1].links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}

              {/* Open Source */}
              <div className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Open source
              </div>

              <Link
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <IconBrandGithub size={18} stroke={1.8} />
                GitHub
              </Link>

              {/* Mobile Actions */}
              <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  nativeButton={false}
                  render={
                    <Link href="/login" onClick={closeMobileMenu}>
                      Log in
                    </Link>
                  }
                />

                <Button
                  className="w-full"
                  nativeButton={false}
                  render={
                    <Link href="/register" onClick={closeMobileMenu}>
                      Get started
                    </Link>
                  }
                />
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    </motion.header>
  );
};
