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
      <div className="workspace-page space-y-6">
        <div className="page-heading">
          <div>
        <h1>Links</h1>
        <p>
          {result.message}
        </p>
          </div>
        </div>
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
