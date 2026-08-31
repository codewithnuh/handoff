import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { Folder } from "./folder";

export function FinalCTA() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="border-t border-border bg-background px-6 py-24 sm:py-28"
    >
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-10 flex justify-center">
          <Folder
            size={1.5}
            color="#9f1239"
            items={[
              <div key="deliverable" className="flex h-full items-center justify-center rounded-lg bg-primary/10 p-2">
                <span className="text-xs font-medium text-primary">Deliverables</span>
              </div>,
              <div key="invoices" className="flex h-full items-center justify-center rounded-lg bg-secondary p-2">
                <span className="text-xs font-medium text-secondary-foreground">Invoices</span>
              </div>,
              <div key="projects" className="flex h-full items-center justify-center rounded-lg bg-accent p-2">
                <span className="text-xs font-medium text-accent-foreground">Projects</span>
              </div>,
            ]}
          />
        </div>

        <header>
          <h2
            id="final-cta-heading"
            className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            Your clients are waiting
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Create your first project in two minutes. No credit card, no
            commitment, no onboarding call.
          </p>
        </header>

        <div className="mt-8">
          <Button size={"lg"} className="p-4">
            <Link href="/signup" className="flex items-center justify-center">
              Get started free
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
