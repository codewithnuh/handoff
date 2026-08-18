import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

export function FinalCTA() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="border-t border-border bg-background px-6 py-24 sm:py-28"
    >
      <div className="mx-auto max-w-3xl text-center">
        <header>
          <h2
            id="final-cta-heading"
            className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            Stop repeating status updates
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Share progress the clean way. Start free — no credit card required.
          </p>
        </header>

        <div className="mt-8">
          <Button size={"lg"} className="p-4">
            <Link href="/signup" className="flex items-center justify-center">
              Start free
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
