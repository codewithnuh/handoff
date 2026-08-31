import { Container } from "@/components/globals/container";

const COMPARISONS = [
  {
    method: "Email chains",
    problem: "Feedback gets buried. Files get lost. Nobody knows which version is final.",
    handoff: "Everything lives in one portal link. Every decision is recorded with a timestamp.",
  },
  {
    method: "Spreadsheets",
    problem: "You update a cell, but your client never checks it. No notifications, no context.",
    handoff: "Clients get notified when something changes. They see progress without logging in.",
  },
  {
    method: "Notion or Trello",
    problem: "Powerful for you, overwhelming for clients. They need an account and a tour.",
    handoff: "One link. No account. Your client opens it and sees exactly what they need to decide.",
  },
];

export function Comparison() {
  return (
    <section className="bg-muted/30 py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            Why not the usual tools
          </div>

          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            You&apos;ve tried workarounds before
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Email, spreadsheets, Notion, Trello. They all work for
            something, but none of them were built for client approvals.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {COMPARISONS.map((item) => (
            <div
              key={item.method}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h3 className="text-base font-semibold text-foreground">
                {item.method}
              </h3>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {item.problem}
              </p>

              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-medium text-primary">
                  Handoff
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {item.handoff}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
