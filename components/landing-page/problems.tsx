"use client";
import { motion } from "motion/react";
import {
  IconBrandWhatsapp,
  IconMail,
  IconMessageCircle,
  IconFile,
  IconClock,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { ScrollReveal } from "./scroll-reveal";
const CHAOS_ITEMS = [
  {
    icon: IconBrandWhatsapp,
    label: "WhatsApp",
    message: "Looks good 👍",
    position: "left-[4%] top-[8%] rotate-[-3deg]",
  },
  {
    icon: IconMail,
    label: "Email",
    message: "One small revision...",
    position: "right-[6%] top-[12%] rotate-[3deg]",
  },
  {
    icon: IconMessageCircle,
    label: "Slack",
    message: "Can you update the logo?",
    position: "left-[10%] bottom-[10%] rotate-[2deg]",
  },
  {
    icon: IconFile,
    label: "Files",
    message: "final-final-v3.pdf",
    position: "right-[9%] bottom-[8%] rotate-[-2deg]",
  },
] as const;
const PROBLEMS = [
  {
    icon: IconClock,
    title: "Feedback gets scattered",
    description:
      "Messages, revisions, and approvals live across different apps and conversations.",
  },
  {
    icon: IconFile,
    title: "Versions get confusing",
    description:
      "You resend files, rename drafts, and wonder which version your client actually saw.",
  },
  {
    icon: IconAlertTriangle,
    title: "You become the middleman",
    description:
      "Instead of doing the work, you spend your time chasing people, files, and decisions.",
  },
];
export const ProblemSection = () => {
  return (
    <section className="overflow-hidden bg-background py-28 text-foreground sm:py-32">
      {" "}
      <div className="mx-auto max-w-6xl px-6">
        {" "}
        {/* Header */}{" "}
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          {" "}
          <div className="mb-5 inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            {" "}
            The problem{" "}
          </div>{" "}
          <h2 className="font-heading text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            {" "}
            Your work is everywhere. <br />{" "}
            <span className="text-muted-foreground">
              {" "}
              Your client shouldn&apos;t have to be.{" "}
            </span>{" "}
          </h2>{" "}
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {" "}
            Freelance projects shouldn&apos;t require a scavenger hunt across
            WhatsApp, email, Slack, and folders just to figure out what&apos;s
            approved.{" "}
          </p>{" "}
        </ScrollReveal>{" "}
        {/* Chaos visualization */}{" "}
        <ScrollReveal className="mt-16">
          {" "}
          <div className="relative mx-auto h-[390px] max-w-5xl overflow-hidden rounded-2xl border border-border bg-muted/20">
            {" "}
            {/* Subtle grid */}{" "}
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40"
            />{" "}
            {/* Center */}{" "}
            <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
              {" "}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex size-20 items-center justify-center rounded-2xl border border-border bg-background shadow-lg"
              >
                {" "}
                <span className="font-heading text-xl font-semibold">
                  {" "}
                  You{" "}
                </span>{" "}
              </motion.div>{" "}
              <p className="mt-4 text-sm font-medium">
                {" "}
                stuck in the middle{" "}
              </p>{" "}
              <p className="mt-1 text-xs text-muted-foreground">
                {" "}
                chasing replies, files & approvals{" "}
              </p>{" "}
            </div>{" "}
            {/* Connection lines */}{" "}
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-px w-[78%] -translate-x-1/2 bg-border/50"
            />{" "}
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[70%] w-px -translate-x-1/2 -translate-y-1/2 bg-border/50"
            />{" "}
            {/* Floating communication items */}{" "}
            {CHAOS_ITEMS.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                  className={`absolute z-20 ${item.position}`}
                >
                  {" "}
                  <div className="flex w-52 items-center gap-3 rounded-xl border border-border bg-background/95 p-3 shadow-sm backdrop-blur-sm sm:w-60">
                    {" "}
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {" "}
                      <Icon
                        size={17}
                        stroke={1.8}
                        className="text-muted-foreground"
                      />{" "}
                    </div>{" "}
                    <div className="min-w-0">
                      {" "}
                      <p className="text-xs font-medium text-muted-foreground">
                        {" "}
                        {item.label}{" "}
                      </p>{" "}
                      <p className="mt-0.5 truncate text-sm font-medium">
                        {" "}
                        {item.message}{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                </motion.div>
              );
            })}{" "}
            {/* Bottom label */}{" "}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-background/90 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
              {" "}
              too many places · too many versions · too much chasing{" "}
            </div>{" "}
          </div>{" "}
        </ScrollReveal>{" "}
        {/* Consequences */}{" "}
        <div className="mx-auto mt-14 grid max-w-5xl gap-8 border-t border-border pt-10 md:grid-cols-3">
          {" "}
          {PROBLEMS.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="group"
              >
                {" "}
                <div className="mb-4 flex size-9 items-center justify-center rounded-lg border border-border bg-muted/50">
                  {" "}
                  <Icon
                    size={17}
                    stroke={1.8}
                    className="text-muted-foreground"
                  />{" "}
                </div>{" "}
                <h3 className="font-heading text-base font-semibold tracking-tight">
                  {" "}
                  {problem.title}{" "}
                </h3>{" "}
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {" "}
                  {problem.description}{" "}
                </p>{" "}
              </motion.div>
            );
          })}{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
};
