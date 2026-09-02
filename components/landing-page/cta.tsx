import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Folder } from "./folder";

export function FinalCTA() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="border-t border-border bg-background px-4 py-20 sm:px-6 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-muted/30 px-5 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
          {/* Background decoration */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

            <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--border)/0.6)_1px,transparent_1px)] bg-[size:22px_22px] opacity-40" />
          </div>

          <div className="relative mx-auto max-w-3xl text-center">
            {/* Folder visual */}
            <div className="mb-10 flex justify-center sm:mb-12">
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-5 rounded-full bg-primary/10 blur-2xl"
                />

                <div className="relative">
                  <Folder
                    size={1.5}
                    color="#9f1239"
                    items={[
                      <div
                        key="deliverable"
                        className="flex h-full items-center justify-center rounded-lg bg-primary/10 p-2"
                      >
                        <span className="text-xs font-medium text-primary">
                          Deliverables
                        </span>
                      </div>,

                      <div
                        key="invoices"
                        className="flex h-full items-center justify-center rounded-lg bg-secondary p-2"
                      >
                        <span className="text-xs font-medium text-secondary-foreground">
                          Invoices
                        </span>
                      </div>,

                      <div
                        key="projects"
                        className="flex h-full items-center justify-center rounded-lg bg-accent p-2"
                      >
                        <span className="text-xs font-medium text-accent-foreground">
                          Projects
                        </span>
                      </div>,
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Heading */}
            <header>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <span className="size-1.5 rounded-full bg-primary" />
                Ready when you are
              </div>

              <h2
                id="final-cta-heading"
                className="font-heading text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl"
              >
                Stop chasing.
                <br />
                <span className="text-muted-foreground">
                  Start handing off.
                </span>
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Give every client one place to review your work, leave feedback,
                and approve deliverables. Your next project can start with a
                cleaner handoff.
              </p>
            </header>

            {/* CTA */}
            <div className="mt-9 flex flex-col items-center gap-4 sm:mt-10">
              <Link
                href="/signup"
                className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
              >
                Get started free
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>

              <p className="text-xs text-muted-foreground">
                No credit card required
              </p>
            </div>

            {/* Trust points */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground sm:flex-row sm:gap-6">
              <span className="inline-flex items-center gap-1.5">
                <Check
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-primary"
                />
                Free to start
              </span>

              <span className="hidden h-3 w-px bg-border sm:block" />

              <span className="inline-flex items-center gap-1.5">
                <Check
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-primary"
                />
                No client accounts
              </span>

              <span className="hidden h-3 w-px bg-border sm:block" />

              <span className="inline-flex items-center gap-1.5">
                <Check
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-primary"
                />
                Set up in minutes
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
