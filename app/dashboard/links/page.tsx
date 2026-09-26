import { LinksPage } from "@/components/dashboard/links-page";
import { listAllLinks } from "@/lib/actions/links";
import { requireWorkspacePermission } from "@/lib/access";
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
    <LinksPage
      teamLinks={result.data.teamLinks}
      clientLinks={result.data.clientLinks}
    />
  );
}
