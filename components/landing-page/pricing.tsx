import { Container } from "@/components/globals/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "Deliver your first client work end-to-end.",
    features: [
      "1 workspace",
      "Up to 3 active projects",
      "Passwordless client portal",
      "Approvals & change requests",
    ],
    cta: { label: "Start for free", href: "/register" },
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    blurb: "For studios running many clients in parallel.",
    features: [
      "5 workspaces",
      "Up to 100 projects per workspace",
      "Team members with project-level roles",
      "Need-to-know project scoping",
      "Priority support",
    ],
    cta: { label: "Upgrade to Pro", href: "/register" },
    highlighted: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 py-16">
      <Container>
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="secondary">Pricing</Badge>
          <h2 className="text-2xl font-bold tracking-tight">
            Simple pricing that scales with you
          </h2>
          <p className="text-sm text-muted-foreground">
            Start free. Upgrade when your team grows — no per-client fees.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.highlighted
                  ? "relative rounded-lg border border-primary/40 bg-card p-6 shadow-xs"
                  : "rounded-lg border border-border bg-card p-6 shadow-xs"
              }
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{tier.name}</h3>
                <p>
                  <span className="text-2xl font-bold">{tier.price}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {tier.period}
                  </span>
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{tier.blurb}</p>

              <ul className="mt-4 space-y-1.5">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <Check className="size-3.5 mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                size="sm"
                variant={tier.highlighted ? "default" : "outline"}
                render={<a href={tier.cta.href} />}
              >
                {tier.cta.label}
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Prices in USD. Online checkout coming soon — contact us to upgrade in
          the meantime.
        </p>
      </Container>
    </section>
  );
}
