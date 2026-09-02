"use client";

import { motion } from "motion/react";
import {
  IconArrowRight,
  IconBrandNotion,
  IconBrandTrello,
  IconMail,
  IconCheck,
  IconX,
} from "@tabler/icons-react";

import { Container } from "@/components/globals/container";
import { ScrollReveal } from "./scroll-reveal";

const COMPARISONS = [
  {
    method: "Email",
    icon: IconMail,
    problem: "Feedback gets buried in threads.",
    detail: "Files, replies, and decisions are scattered across conversations.",
  },
  {
    method: "Notion",
    icon: IconBrandNotion,
    problem: "Clients see more than they need.",
    detail:
      "Great for documentation. Less ideal when someone just needs to approve a file.",
  },
  {
    method: "Trello",
    icon: IconBrandTrello,
    problem: "A board isn't a client portal.",
    detail:
      "Powerful workflows can become unnecessary complexity for a simple review.",
  },
];

export function Comparison() {
  return (
    <section className="overflow-hidden bg-background py-24 sm:py-28 lg:py-32">
      <Container>
        {/* Header */}
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Why Handoff
          </div>

          <h2 className="font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            Your tools aren&apos;t the problem.
            <br />
            <span className="text-muted-foreground">
              They just weren&apos;t built for this.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Email, Notion, and Trello are great tools. But when the goal is
            simply to get a client to review and approve your work, they can add
            more steps than they remove.
          </p>
        </ScrollReveal>

        {/* Comparison */}
        <div className="mx-auto mt-16 max-w-5xl lg:mt-20">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            {/* Existing tools */}
            <div className="rounded-2xl border border-border bg-muted/20 p-5 sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    The usual way
                  </p>

                  <h3 className="mt-1 font-heading text-lg font-semibold tracking-tight">
                    Workarounds
                  </h3>
                </div>

                <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-background">
                  <IconX
                    size={17}
                    stroke={1.8}
                    className="text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {COMPARISONS.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={item.method}
                      initial={{ opacity: 0, x: -15 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{
                        once: true,
                        margin: "-80px",
                      }}
                      transition={{
                        duration: 0.45,
                        delay: index * 0.08,
                      }}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon
                            size={17}
                            stroke={1.8}
                            className="text-muted-foreground"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{item.method}</p>

                          <p className="mt-1 text-sm leading-5 text-muted-foreground">
                            {item.problem}
                          </p>

                          <p className="mt-2 text-xs leading-5 text-muted-foreground/70">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center py-1 lg:px-2">
              <div className="flex size-10 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                <IconArrowRight
                  size={17}
                  stroke={1.8}
                  className="hidden lg:block text-muted-foreground"
                />

                <span className="text-sm text-muted-foreground lg:hidden">
                  ↓
                </span>
              </div>
            </div>

            {/* Handoff */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{
                once: true,
                margin: "-80px",
              }}
              transition={{
                duration: 0.55,
                ease: [0.23, 1, 0.32, 1],
              }}
              className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6"
            >
              {/* Decorative glow */}
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 blur-3xl"
              />

              <div className="relative">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">
                      The Handoff way
                    </p>

                    <h3 className="mt-1 font-heading text-lg font-semibold tracking-tight">
                      One client portal
                    </h3>
                  </div>

                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <IconCheck size={17} stroke={2} />
                  </div>
                </div>

                <div className="rounded-xl border border-primary/15 bg-background p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <IconCheck
                        size={19}
                        stroke={2}
                        className="text-primary"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">Ready for review</p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Client can see exactly what needs attention.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {[
                      "Deliverables in one place",
                      "Comments attached to files",
                      "Approval recorded automatically",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <IconCheck
                          size={15}
                          stroke={2}
                          className="shrink-0 text-primary"
                        />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  One link for your client. One place for feedback. One clear
                  answer when the work is ready.
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom statement */}
        <ScrollReveal className="mx-auto mt-12 max-w-xl text-center lg:mt-16">
          <p className="text-sm leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">
              Handoff doesn&apos;t replace your tools.
            </span>{" "}
            It gives your client a simpler place to review the work you already
            created.
          </p>
        </ScrollReveal>
      </Container>
    </section>
  );
}
