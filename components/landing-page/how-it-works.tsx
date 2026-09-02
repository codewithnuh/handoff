"use client";

import { motion } from "motion/react";
import { IconFolderPlus, IconLink, IconCircleCheck } from "@tabler/icons-react";

import { Container } from "@/components/globals/container";
import { ScrollReveal } from "./scroll-reveal";

const STEPS = [
  {
    number: "01",
    title: "Create a project",
    description:
      "Add your client, name the project, and upload the files they need to review.",
    icon: IconFolderPlus,
    label: "Your workspace",
  },
  {
    number: "02",
    title: "Share one link",
    description:
      "Send your client a single portal link. They open it in their browser with no account required.",
    icon: IconLink,
    label: "Client portal",
  },
  {
    number: "03",
    title: "Get a clear decision",
    description:
      "Your client approves, requests changes, or leaves a comment. Everything stays attached to the right file.",
    icon: IconCircleCheck,
    label: "Clear feedback",
  },
];

export function HowItWorks() {
  return (
    <section className="overflow-hidden bg-muted/30 py-24 sm:py-28 lg:py-32">
      <Container>
        {/* Header */}
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <div className="mb-5 inline-flex items-center rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            How it works
          </div>

          <h2 className="font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            From upload to approval.
            <br />
            <span className="text-muted-foreground">
              Without the back-and-forth.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Handoff keeps the entire review process in one simple client portal.
            Set it up once, send the link, and let the project move forward.
          </p>
        </ScrollReveal>

        {/* Steps */}
        <div className="relative mx-auto mt-16 max-w-5xl lg:mt-20">
          {/* Desktop connecting line */}
          <div
            aria-hidden="true"
            className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px bg-border md:block"
          />

          {/* Animated progress line */}
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
              duration: 1.2,
              ease: [0.23, 1, 0.32, 1],
            }}
            className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px origin-left bg-primary md:block"
          />

          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{
                    once: true,
                    margin: "-80px",
                  }}
                  transition={{
                    duration: 0.55,
                    delay: index * 0.12,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className="relative"
                >
                  {/* Mobile timeline */}
                  {index !== STEPS.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="absolute left-6 top-14 h-[calc(100%+2.5rem)] w-px bg-border md:hidden"
                    />
                  )}

                  <div className="relative md:text-center">
                    {/* Icon */}
                    <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl border border-border bg-background shadow-sm md:mx-auto">
                      <Icon
                        size={21}
                        stroke={1.8}
                        className="text-foreground"
                      />

                      {/* Step number */}
                      <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-background bg-primary text-[10px] font-bold text-primary-foreground">
                        {step.number}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="ml-[4.5rem] -mt-14 md:ml-0 md:mt-6">
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {step.label}
                      </div>

                      <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                        {step.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-[15px]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom statement */}
        <ScrollReveal className="mx-auto mt-16 max-w-2xl sm:mt-20">
          <div className="rounded-2xl border border-border bg-background/70 px-5 py-4 text-center shadow-sm backdrop-blur sm:px-8 sm:py-5">
            <p className="text-sm text-muted-foreground sm:text-[15px]">
              <span className="font-medium text-foreground">
                No client accounts.
              </span>{" "}
              No complicated setup. Just one place for your work and their
              feedback.
            </p>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
