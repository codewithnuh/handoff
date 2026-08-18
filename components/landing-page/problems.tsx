import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const PROBLEMS = [
  {
    number: "01",
    title: "Scattered questions",
    description:
      "“What’s the status?” arrives in WhatsApp, email, and Slack — often about work you already sent.",
  },
  {
    number: "02",
    title: "No single source of truth",
    description:
      "Clients dig through old threads looking for the latest file, update, or decision.",
  },
  {
    number: "03",
    title: "Unclear decisions",
    description:
      "Accepts, rejects, and feedback live in different places. Nothing is cleanly recorded.",
  },
];

export const ProblemSection = () => {
  return (
    <section className="bg-background py-24 text-foreground">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section heading */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            The problem
          </div>

          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            The status update problem
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Most freelancers lose time and professionalism to the same messy
            loops.
          </p>
        </div>

        {/* Problem cards */}
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <Card
              key={problem.number}
              className="
                group relative overflow-hidden
                border-border bg-card
                transition-all duration-200
                hover:-translate-y-0.5
                hover:shadow-md
              "
            >
              {/* Subtle top line */}
              <div
                aria-hidden
                className="
                  absolute inset-x-0 top-0 h-px
                  bg-gradient-to-r
                  from-transparent
                  via-border
                  to-transparent
                "
              />

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span
                    className="
                      flex size-9 items-center bg-primary text-primary-foreground justify-center
                      rounded-md border border-border
                    
                      text-xs font-semibold
                      text-muted-foreground
                    "
                  >
                    {problem.number}
                  </span>

                  <span
                    className="
                      text-muted-foreground/40
                      transition-colors
                      group-hover:text-muted-foreground
                    "
                  >
                    ↗
                  </span>
                </div>

                <CardTitle className="pt-3 font-heading text-lg tracking-tight">
                  {problem.title}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {problem.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
