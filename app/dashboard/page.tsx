import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { getCurrentWorkspace } from "@/lib/actions/workspace";
import { listClients } from "@/lib/actions/client";
import { getSession } from "@/lib/actions/auth";

export default async function Dashboard() {
  const [workspaceResult, sessionResult, clientsResult] = await Promise.all([
    getCurrentWorkspace(),
    getSession(),
    listClients(),
  ]);

  const workspaceName =
    workspaceResult.success && workspaceResult.data
      ? workspaceResult.data.name
      : "Your Workspace";

  const user = sessionResult.success ? sessionResult.data : null;
  const userName =
    user?.user.name ??
    (user?.user.email
      ? user.user.email.split("@")[0].slice(0, 1).toUpperCase() +
        user.user.email.split("@")[0].slice(1)
      : "there");

  const clients =
    clientsResult.success
      ? clientsResult.data.items.map((client) => ({
          id: client.id,
          name: client.name,
          email: client.email,
        }))
      : [];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
      </div>
      <DashboardHeader
        userName={userName}
        workspaceName={workspaceName}
        clients={clients}
      />
    </div>
  );
}