import { LinksPage } from "@/components/dashboard/links-page";
import { listAllLinks } from "@/lib/actions/links";
import { Suspense } from "react";
import { LinksPageSkeleton } from "@/components/dashboard/links-page";
import { requireWorkspacePermission } from "@/lib/actions/guards";
import { redirect } from "next/navigation";

export const metadata = { title: "Links · Handoff" };

export default async function LinksRoute() {
  const guard = await requireWorkspacePermission("MANAGE_MEMBERS");
  if (!guard.ok) {
    redirect(guard.error.error.code === "UNAUTHORIZED" ? "/login" : "/dashboard");
  }

  const result = await listAllLinks();

  if (!result.success) {
    return (
      <div className="p-4 md:p-6 max-w-5xl">
        <h1 className="text-2xl font-bold tracking-tight">Links</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {result.message}
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<LinksPageSkeleton />}>
      <LinksPage
        teamLinks={result.data.teamLinks}
        clientLinks={result.data.clientLinks}
      />
    </Suspense>
  );
}
