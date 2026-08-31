"use client";

import React from "react";
import { motion } from "motion/react";
import { BentoGrid, BentoGridItem } from "../ui/bento-grid";
import {
  IconChartLine,
  IconCircleCheck,
  IconEye,
  IconDeviceMobile,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export function FeaturesSection() {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-medium text-primary">What you get</p>

          <h2 className="font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Everything your client needs. Nothing they don&apos;t.
          </h2>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            No onboarding. No app to install. They open a link and see
            what&apos;s done, what&apos;s next, and where to leave feedback.
          </p>
        </div>

        <BentoGrid className="mx-auto max-w-5xl">
          {items.map((item, i) => (
            <BentoGridItem
              key={item.title}
              title={item.title}
              description={item.description}
              header={<FeatureVisual index={i} />}
              icon={item.icon}
              className={cn(i === 0 || i === 3 ? "md:col-span-2" : "")}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}

const FeatureVisual = ({ index }: { index: number }) => {
  const visuals = [
    // 0 — Live status (col-span-2)
    <motion.div
      key={0}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="flex h-full min-h-[10rem] w-full items-center justify-center rounded-xl border border-border bg-muted p-4 md:p-6"
    >
      <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex-1 rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4v9a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6.5 3.5A1 1 0 005.8 3H3a1 1 0 00-1 1z" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">Brand Guidelines v2.pdf</p>
              <p className="text-[10px] text-muted-foreground">2 days ago</p>
            </div>
            <span className="shrink-0 inline-flex h-5 items-center rounded-full bg-yellow-500/10 px-1.5 text-[8px] font-medium text-yellow-700">Review</span>
          </div>
          <div className="mt-2">
            <div className="mb-1 flex items-end justify-between">
              <span className="text-[9px] text-muted-foreground">Progress</span>
              <span className="text-[9px] font-medium tabular-nums">68%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "68%" }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="flex-1 rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">Logo Final.svg</p>
              <p className="text-[10px] text-muted-foreground">5 days ago</p>
            </div>
            <span className="shrink-0 inline-flex h-5 items-center rounded-full bg-green-500/10 px-1.5 text-[8px] font-medium text-green-700">Approved</span>
          </div>
          <div className="mt-2">
            <div className="mb-1 flex items-end justify-between">
              <span className="text-[9px] text-muted-foreground">Progress</span>
              <span className="text-[9px] font-medium tabular-nums">100%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.65, ease: "easeOut" }}
                className="h-full rounded-full bg-green-500"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>,

    // 1 — Accept or reject
    <motion.div
      key={1}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="flex h-full min-h-[10rem] w-full items-center justify-center rounded-xl border border-border bg-muted p-4"
    >
      <div className="w-full max-w-[13rem] space-y-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-lg border border-border bg-card p-2.5 shadow-sm"
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[8px] font-bold text-primary">S</div>
            <span className="text-[10px] font-medium">Sarah</span>
            <span className="text-[9px] text-muted-foreground">Client</span>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Love the color palette!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="flex gap-1.5"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-green-200 bg-green-50 text-[9px] font-medium text-green-700"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            Approve
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 text-[9px] font-medium text-red-700"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            Reject
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.65 }}
          className="flex items-center gap-1.5 rounded-md bg-card border border-border px-2 py-1.5 shadow-sm"
        >
          <div className="size-1.5 rounded-full bg-green-500" />
          <span className="text-[9px] text-muted-foreground">Decision recorded</span>
        </motion.div>
      </div>
    </motion.div>,

    // 2 — Control visibility
    <motion.div
      key={2}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="flex h-full min-h-[10rem] w-full items-center justify-center rounded-xl border border-border bg-muted p-4"
    >
      <div className="w-full max-w-[13rem] space-y-1.5">
        <p className="mb-1 text-[9px] font-medium text-muted-foreground">Share settings</p>
        {[
          { label: "Deliverables", on: true },
          { label: "Activity feed", on: true },
          { label: "Internal notes", on: false },
          { label: "Drafts", on: false },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.25 + i * 0.08 }}
            className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 shadow-sm"
          >
            <span className="text-[10px]">{item.label}</span>
            <div className={`flex size-4 items-center justify-center rounded-full transition-colors ${item.on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/40"}`}>
              {item.on ? (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              ) : (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="1" y1="1" x2="23" y2="23" /></svg>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>,

    // 3 — Works on any phone (col-span-2)
    <motion.div
      key={3}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="flex h-full min-h-[10rem] w-full items-center justify-center rounded-xl border border-border bg-muted p-4 md:p-6"
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <motion.div
          initial={{ opacity: 0, rotate: -3 }}
          whileInView={{ opacity: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3, type: "spring" }}
          className="relative w-[8rem] shrink-0 rounded-[1rem] border-2 border-border bg-card p-1.5 shadow-md sm:w-[9rem]"
        >
          <div className="mx-auto mb-1.5 h-1.5 w-8 rounded-full bg-muted" />
          <div className="space-y-1 rounded-md bg-muted/50 p-1.5">
            <div className="rounded bg-card p-1.5 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[7px] font-medium">Brand Refresh</span>
                <span className="rounded-full bg-primary/10 px-1 text-[6px] font-medium text-primary">68%</span>
              </div>
              <div className="h-0.5 w-full rounded-full bg-muted"><div className="h-0.5 w-[68%] rounded-full bg-primary" /></div>
            </div>
            <div className="rounded bg-card p-1.5 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[7px] font-medium">Mobile App</span>
                <span className="rounded-full bg-primary/10 px-1 text-[6px] font-medium text-primary">42%</span>
              </div>
              <div className="h-0.5 w-full rounded-full bg-muted"><div className="h-0.5 w-[42%] rounded-full bg-primary" /></div>
            </div>
            <div className="flex gap-1 pt-0.5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="flex-1 rounded bg-green-500/10 py-0.5 text-[6px] font-medium text-green-700"
              >
                Approve
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="flex-1 rounded bg-red-500/10 py-0.5 text-[6px] font-medium text-red-700"
              >
                Reject
              </motion.button>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-2">
          {[
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>, title: "Any device", sub: "iPhone, Android, tablet" },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, title: "Private by default", sub: "No login required" },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>, title: "Works offline", sub: "Caches deliverables" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-2"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                {f.icon}
              </div>
              <div>
                <p className="text-[11px] font-medium leading-tight">{f.title}</p>
                <p className="text-[9px] text-muted-foreground">{f.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>,
  ];
  return visuals[index] ?? null;
};

const items = [
  {
    title: "One link, full picture",
    description:
      "Clients see every deliverable, its status, and the latest file. No more 'which version did you send?'",
    icon: <IconChartLine className="h-5 w-5 text-primary" />,
  },
  {
    title: "Decisions on the spot",
    description:
      "Approve, reject, or comment right on the work. Every decision gets timestamped and stored.",
    icon: <IconCircleCheck className="h-5 w-5 text-primary" />,
  },
  {
    title: "Show only what matters",
    description:
      "Toggle deliverables, drafts, and internal notes on or off per project. Clients never see what they shouldn't.",
    icon: <IconEye className="h-5 w-5 text-primary" />,
  },
  {
    title: "Looks good on their phone",
    description:
      "Most clients open links on mobile. The portal is fast, clean, and readable on any screen.",
    icon: <IconDeviceMobile className="h-5 w-5 text-primary" />,
  },
];
