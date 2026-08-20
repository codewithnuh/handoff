"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Container } from "./container";
import { IconHandOff } from "@tabler/icons-react";
import { Button } from "../ui/button";
export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0  top-0 z-50 shadow-xs transition-all duration-300",
        scrolled
          ? "border-b border-border/50 bg-background/50 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container>
        <nav className="mx-auto  flex h-16 max-w-6xl items-center justify-between sm:px-6">
          {/* Logo */}
          <Link
            href="/"
            className="font-heading flex text-lg font-semibold tracking-tight text-foreground"
          >
            <IconHandOff /> <span>HandOff </span>
          </Link>

          {/* Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            <a
              href="#features"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Features
            </a>

            <a
              href="#pricing"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Pricing
            </a>

            <a
              href="#about"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              About
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button size={"lg"}>
              <Link href={"/login"}>Login</Link>
            </Button>

            <Button size={"lg"}>
              <Link href={"/register"}>Register</Link>
            </Button>
          </div>
        </nav>
      </Container>
    </header>
  );
};
