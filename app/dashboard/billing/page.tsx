import { redirect } from "next/navigation";
import { requireWorkspacePermission } from "@/lib/actions/guards";
import { getWorkspaceUsage } from "@/lib/queries/project";
import { PlanCards } from "@/components/dashboard/billing/plan-cards";

export const metadata = { title: "Billing — Handoff" };

function UsageBar({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number;
}) {
  const percent = Math.min(Math.round((used / max) * 100), 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {used} / {max}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-2 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const guard = await requireWorkspacePermission("MANAGE_BILLING");
  if (!guard.ok) {
    redirect(guard.error.error.code === "UNAUTHORIZED" ? "/login" : "/dashboard");
  }

  const usage = await getWorkspaceUsage();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your plan and usage for {guard.value.workspace.name}.
        </p>
      </div>

      {usage ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {usage.workspaces.max > 0 && (
              <UsageBar
                label="Workspaces"
                used={usage.workspaces.used}
                max={usage.workspaces.max}
              />
            )}
            <UsageBar
              label="Projects"
              used={usage.projects.used}
              max={usage.projects.max}
            />
          </div>

          <PlanCards usage={usage} />

          <p className="text-[10px] text-muted-foreground">
            Payment processing is not yet connected. Buttons are placeholders
            ready for your payment provider.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Usage information is unavailable right now.
        </p>
      )}
    </div>
  );
}
