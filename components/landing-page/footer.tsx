import Link from "next/link";
import { Container } from "../globals/container";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <Container>
        <div className="flex flex-col gap-8 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
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

            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              One link for client approvals. No more chasing answers
              across email, Slack, and WhatsApp.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-foreground"
                >
                  Features
                </Link>
              </li>

              <li>
                <Link
                  href="/#pricing"
                  className="transition-colors hover:text-foreground"
                >
                  Pricing
                </Link>
              </li>

              <li>
                <Link
                  href="/login"
                  className="transition-colors hover:text-foreground"
                >
                  Login
                </Link>
              </li>

              <li>
                <Link
                  href="/register"
                  className="transition-colors hover:text-foreground"
                >
                  Start free
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} HandOff. All rights reserved.</p>

          <nav aria-label="Legal navigation">
            <ul className="flex gap-5">
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-foreground"
                >
                  Privacy
                </Link>
              </li>

              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-foreground"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
