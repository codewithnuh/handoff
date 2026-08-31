import { Container } from "@/components/globals/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const COMPARISON = [
  { feature: "Workspaces", free: "1", pro: "5" },
  { feature: "Active projects per workspace", free: "3", pro: "100" },
  { feature: "Team members", free: "Unlimited", pro: "Unlimited" },
  { feature: "Client portal", free: true, pro: true },
  { feature: "Deliverable tracking", free: true, pro: true },
  { feature: "Approvals and rejections", free: true, pro: true },
  { feature: "Activity feed and comments", free: true, pro: true },
  { feature: "Share toggles (visibility control)", free: true, pro: true },
  { feature: "Project-level roles", free: true, pro: true },
  { feature: "Need-to-know scoping", free: true, pro: true },
  { feature: "Priority support", free: false, pro: true },
];

const Check = ({ yes = true }: { yes?: boolean }) =>
  yes ? (
    <span className="inline-flex size-5 items-center justify-center">
      <svg
        className="size-4 shrink-0 text-green-600"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  ) : (
    <span className="inline-flex size-5 items-center justify-center text-muted-foreground/30">
      &mdash;
    </span>
  );

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-xl space-y-3 text-center">
          <Badge variant="secondary">Pricing</Badge>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What you pay is what you get
          </h2>

          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            Start free with everything included. Upgrade when you need more
            workspaces and projects. No per-client fees, no hidden charges.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border shadow-sm">
          <div className="grid md:grid-cols-2">
            {/* Free */}
            <div className="relative flex flex-col p-7 sm:p-8 bg-card">
              <div className="pr-28">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Free
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-700">
                    Self-hostable
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                  All features, no limits on your team. Host it yourself
                  or use our cloud.
                </p>
              </div>

              <div className="mt-7">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    $0
                  </span>
                  <span className="text-sm text-muted-foreground">
                    forever
                  </span>
                </div>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check /> <span>1 workspace</span>
                </li>
                <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check /> <span>Up to 3 active projects</span>
                </li>
                <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check /> <span>Unlimited team members</span>
                </li>
                <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check /> <span>All features included</span>
                </li>
              </ul>

              <Button
                className="mt-8 w-full"
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<a href="/register" />}
              >
                Get started free
              </Button>
            </div>

            {/* Pro */}
            <div className="relative flex flex-col p-7 sm:p-8 bg-primary text-primary-foreground">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-black/10"
              />
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

              <div className="relative z-10 flex h-full flex-col">
                <Badge className="absolute right-0 top-0 border-0 bg-white/15 text-white hover:bg-white/20">
                  Most popular
                </Badge>

                <div className="pr-28">
                  <h3 className="text-lg font-semibold text-white">Pro</h3>
                  <p className="mt-1.5 text-sm leading-5 text-white/75">
                    More room for studios and agencies running many clients
                    at once.
                  </p>
                </div>

                <div className="mt-7">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold tracking-tight text-white">
                      $12
                    </span>
                    <span className="text-sm text-white/60">/ month</span>
                  </div>
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  <li className="flex items-center gap-2.5 text-sm text-white/90">
                    <Check yes={false} /> <span>5 workspaces</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-white/90">
                    <Check yes={false} />{" "}
                    <span>
                      Up to 100 projects per workspace
                      <span className="ml-2 inline-flex h-5 items-center rounded-md bg-white/15 px-1.5 text-[10px] font-medium text-white">
                        100
                      </span>
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-white/90">
                    <Check yes={false} />{" "}
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-white/90">
                    <Check yes={false} /> <span>Priority support</span>
                  </li>
                </ul>

                <Button
                  className="mt-8 w-full bg-white text-primary shadow-sm hover:bg-white/90"
                  size="lg"
                  nativeButton={false}
                  render={<a href="/register" />}
                >
                  Start with Pro
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Full comparison table */}
        <div className="mx-auto mt-12 max-w-3xl">
          <h3 className="text-lg font-semibold text-foreground text-center mb-6">
            Full comparison
          </h3>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Free
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-primary">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={
                      i < COMPARISON.length - 1 ? "border-b border-border" : ""
                    }
                  >
                    <td className="px-4 py-3 text-foreground">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {typeof row.free === "boolean" ? (
                        <div className="flex items-center justify-center">
                          <Check yes={row.free} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {row.free}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {typeof row.pro === "boolean" ? (
                        <div className="flex items-center justify-center">
                          <Check yes={row.pro} />
                        </div>
                      ) : (
                        <span className="font-medium text-foreground">
                          {row.pro}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-5 text-muted-foreground">
          Prices are in USD. Online checkout is coming soon. In the meantime,
          contact us to upgrade to Pro.
        </p>
      </Container>
    </section>
  );
}
