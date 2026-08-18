import React from "react";
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
        {/* Section heading */}
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-medium text-primary">FEATURES</p>

          <h2 className="font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Built for clarity
          </h2>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Only what freelancers and their clients actually need.
          </p>
        </div>

        {/* Bento Grid */}
        <BentoGrid className="mx-auto max-w-5xl">
          {items.map((item, i) => (
            <BentoGridItem
              key={item.title}
              title={item.title}
              description={item.description}
              header={<FeatureVisual number={i + 1} />}
              icon={item.icon}
              className={cn(i === 0 || i === 3 ? "md:col-span-2" : "")}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}

const FeatureVisual = ({ number }: { number: number }) => {
  return (
    <div className="flex h-full min-h-[10rem] w-full items-center justify-center rounded-xl border border-border bg-muted">
      <span className="text-7xl font-semibold tracking-tighter text-muted-foreground/20">
        0{number}
      </span>
    </div>
  );
};

const items = [
  {
    title: "Live status clients trust",
    description:
      "Deliverables show real progress. No more digging through messages for the latest version.",
    icon: <IconChartLine className="h-5 w-5 text-primary" />,
  },
  {
    title: "Accept or reject in context",
    description:
      "Clients make decisions directly on the work. Feedback and history stay attached.",
    icon: <IconCircleCheck className="h-5 w-5 text-primary" />,
  },
  {
    title: "You control visibility",
    description:
      "Share only what you want them to see. Internal notes and drafts stay private.",
    icon: <IconEye className="h-5 w-5 text-primary" />,
  },
  {
    title: "Works on any phone",
    description:
      "Most clients open links on mobile. The private view is clean and readable there.",
    icon: <IconDeviceMobile className="h-5 w-5 text-primary" />,
  },
];
