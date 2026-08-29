"use client";

/**
 * PlanCards — plan comparison + upgrade CTA.
 *
 * ⚠️ PAYMENTS PLACEHOLDER: upgrade/downgrade buttons are intentionally
 * inert. Wire your provider (Paddle) here:
 *   1. Call your checkout endpoint / Paddle.js overlay with the price ID.
 *   2. On webhook confirmation (paddle_webhook_events → subscriptions),
 *      update the workspace subscription row.
 *   3. Revalidate this page.
 */

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import type { WorkspaceUsageData } from "@/lib/queries/project";

const PLANS = [
  {
    key: "FREE" as const,
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "For solo freelancers getting started.",
    features: [
      "1 workspace",
      "Up to 3 projects",
      "Client portal links",
      "Approvals & activity feed",
    ],
  },
  {
    key: "PRO" as const,
    name: "Pro",
    price: "$12",
    period: "per month",
    blurb: "For growing studios and teams.",
    features: [
      "5 workspaces",
      "Up to 100 projects per workspace",
      "Team members with project-level roles",
      "Priority support",
    ],
  },
];

export function PlanCards({ usage }: { usage: WorkspaceUsageData }) {
  const handleUpgrade = () => {
    // TODO(payments): open Paddle checkout here.
    toast.add({
      type: "info",
      title: "Payments coming soon",
      description:
        "Online checkout isn't connected yet — reach out to upgrade manually.",
    });
  };

  const handleDowngrade = () => {
    // TODO(payments): open the provider's cancellation flow here.
    toast.add({
      type: "info",
      title: "Payments coming soon",
      description: "Subscription management will be available here.",
    });
  };

  return (
    <div className="grid gap-4  md:grid-cols-2">
      {PLANS.map((plan) => {
        const isCurrent = usage.plan === plan.key;
        const isDowngradedToThis =
          plan.key === "FREE" && usage.plan === "FREE" && usage.isDowngraded;
        return (
          <Card
            key={plan.key}
            className={
              isCurrent
                ? "shadow-xs  border-primary/40 relative pt-10"
                : "shadow-xs pt-10"
            }
          >
            {isCurrent && (
              <Badge className="absolute top-1 mb-5 right-4">
                {usage.isDowngraded ? "Downgraded" : "Current plan"}
              </Badge>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-baseline justify-between">
                {plan.name}
                <span className="text-lg font-bold text-foreground">
                  {plan.price}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {plan.period}
                  </span>
                </span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">{plan.blurb}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <Check className="size-3.5 mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                plan.key === "PRO" ? null : usage.isDowngraded ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleUpgrade}
                  >
                    Restore Pro
                  </Button>
                ) : null
              ) : plan.key === "PRO" ? (
                <Button size="sm" className="w-full" onClick={handleUpgrade}>
                  Upgrade to Pro
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleDowngrade}
                >
                  Downgrade to Free
                </Button>
              )}
              {isDowngradedToThis && (
                <p className="text-[10px] text-muted-foreground">
                  Your grace period ended{" "}
                  {usage.gracePeriodEndsAt
                    ? new Date(usage.gracePeriodEndsAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )
                    : ""}
                  . Limits are now on the Free tier.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
