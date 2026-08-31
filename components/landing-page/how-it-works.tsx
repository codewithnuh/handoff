import { Container } from "@/components/globals/container";

const STEPS = [
  {
    number: "1",
    title: "Create a project",
    description:
      "Name it, add a client, and upload your deliverables. Takes about two minutes.",
  },
  {
    number: "2",
    title: "Share the portal link",
    description:
      "Your client opens it in any browser. No account, no app, no onboarding.",
  },
  {
    number: "3",
    title: "They review and decide",
    description:
      "They approve, reject, or comment on each deliverable. You get notified instantly.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            How it works
          </div>

          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Three steps, no learning curve
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            You don&apos;t need to set up a whole system. Create a project,
            send the link, and your client does the rest.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
