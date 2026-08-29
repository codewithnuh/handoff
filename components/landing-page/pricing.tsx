import { Container } from "@/components/globals/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "Everything you need to deliver your first client project.",
    features: [
      "1 workspace",
      "Up to 3 active projects",
      "Passwordless client portal",
      "Approvals & change requests",
      "Activity feed",
    ],
    cta: { label: "Get started free", href: "/register" },
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/ month",
    blurb: "For studios managing multiple clients and projects at once.",
    features: [
      "5 workspaces",
      { text: "Up to 100 projects per workspace", badge: "100" },
      "Team members with project-level roles",
      "Need-to-know project scoping",
      "Priority support",
    ],
    cta: { label: "Start with Pro", href: "/register" },
    highlighted: true,
  },
];

const CheckIcon = ({ highlighted = false }: { highlighted?: boolean }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="size-[17px] shrink-0"
  >
    {/* Circle */}
    <circle
      cx="12"
      cy="12"
      r="10"
      fill={highlighted ? "white" : "currentColor"}
    />

    {/* Check */}
    <path
      d="M8 12.5l2.5 2.5L16 9.5"
      stroke={highlighted ? "#9F1239" : "white"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-24">
      <Container>
        {/* Header */}
        <div className="mx-auto max-w-xl space-y-3 text-center">
          <Badge variant="secondary">Pricing</Badge>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple pricing. No surprises.
          </h2>

          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            Start free and upgrade when you need more room to grow. No
            per-client fees. No complicated plans.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border shadow-sm">
          <div className="grid md:grid-cols-2">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col p-7 sm:p-8 ${
                  tier.highlighted
                    ? "bg-primary text-primary-foreground"
                    : "bg-card"
                }`}
              >
                {/* Dark overlay for Pro */}
                {tier.highlighted && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-black/10"
                  />
                )}

                {/* Subtle Pro texture */}
                {tier.highlighted && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-50"
                    style={{
                      backgroundImage: `
                        linear-gradient(
                          45deg,
                          rgba(255,255,255,0.035) 25%,
                          transparent 25%,
                          transparent 75%,
                          rgba(255,255,255,0.035) 75%
                        ),
                        linear-gradient(
                          45deg,
                          rgba(255,255,255,0.035) 25%,
                          transparent 25%,
                          transparent 75%,
                          rgba(255,255,255,0.035) 75%
                        )
                      `,
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0, 8px 8px",
                    }}
                  />
                )}

                {/* Content */}
                <div className="relative z-10 flex h-full flex-col">
                  {/* Most Popular */}
                  {tier.highlighted && (
                    <Badge className="absolute right-0 top-0 border-0 bg-white/15 text-white hover:bg-white/20">
                      Most popular
                    </Badge>
                  )}

                  {/* Plan Heading */}
                  <div className="pr-28">
                    <h3
                      className={`text-lg font-semibold ${
                        tier.highlighted ? "text-white" : "text-foreground"
                      }`}
                    >
                      {tier.name}
                    </h3>

                    <p
                      className={`mt-1.5 text-sm leading-5 ${
                        tier.highlighted
                          ? "text-white/75"
                          : "text-muted-foreground"
                      }`}
                    >
                      {tier.blurb}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mt-7">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-4xl font-bold tracking-tight ${
                          tier.highlighted ? "text-white" : "text-foreground"
                        }`}
                      >
                        {tier.price}
                      </span>

                      <span
                        className={`text-sm ${
                          tier.highlighted
                            ? "text-white/60"
                            : "text-muted-foreground"
                        }`}
                      >
                        {tier.period}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="mt-8 flex-1 space-y-3">
                    {tier.features.map((feature) => {
                      const text =
                        typeof feature === "string" ? feature : feature.text;

                      const badge =
                        typeof feature === "object" ? feature.badge : null;

                      return (
                        <li
                          key={text}
                          className={`flex items-center gap-2.5 text-sm ${
                            tier.highlighted
                              ? "text-white/90"
                              : "text-muted-foreground"
                          }`}
                        >
                          <CheckIcon highlighted={tier.highlighted} />

                          <span>{text}</span>

                          {badge && (
                            <span
                              className={`inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-medium ${
                                tier.highlighted
                                  ? "bg-white/15 text-white"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* CTA */}
                  <Button
                    className={`mt-8 w-full ${
                      tier.highlighted
                        ? "bg-white text-primary shadow-sm hover:bg-white/90"
                        : ""
                    }`}
                    size="lg"
                    variant={tier.highlighted ? "default" : "outline"}
                    render={<a href={tier.cta.href} />}
                  >
                    {tier.cta.label}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fine Print */}
        <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-5 text-muted-foreground">
          Prices are in USD. Online checkout is coming soon. In the meantime,
          contact us to upgrade to Pro.
        </p>
      </Container>
    </section>
  );
}
