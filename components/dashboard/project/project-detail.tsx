"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  FileCheck,
  MessageSquare,
  Receipt,
  ListTodo,
  Activity as ActivityIcon,
  ChevronRight,
  Calendar,
  User,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ProjectDetailProps } from "./types";
import { ProjectStatusBadge } from "./status-badges";
import { PROJECT_STATUS_OPTIONS } from "@/lib/presentational/status";
import { formatDate } from "@/lib/presentational/format";
import { TasksTab } from "./tasks-tab";
import { DeliverablesTab } from "./deliverables-tab";
import { RequestsTab } from "./requests-tab";
import { InvoicesTab, ActivityTab } from "./invoices-activity-tabs";
import { InviteClientDialog } from "./invite-client-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { EditProjectDialog } from "./edit-project-dialog";
import { updateProjectStatus, deleteProject } from "@/lib/actions/project";
import { useServerAction } from "@/hooks/use-server-action";

const PROJECT_TABS = [
  "tasks",
  "deliverables",
  "requests",
  "invoices",
  "activity",
] as const;

type ProjectTab = (typeof PROJECT_TABS)[number];

const DEFAULT_TAB: ProjectTab = "tasks";

const readTab = (value: string | null): ProjectTab =>
  PROJECT_TABS.find((tab) => tab === value) ?? DEFAULT_TAB;

export function ProjectDetail({ data, permissions, initialTasks, currentUserId }: ProjectDetailProps) {
  const { project, deliverables, requests, invoices, activities } = data;
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = readTab(searchParams.get("tab"));

  const handleTabChange = (value: string) => {
    const tab = readTab(value);
    if (tab === activeTab) return;
    const params = new URLSearchParams(searchParams.toString());
    if (tab === DEFAULT_TAB) params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
  };

  const statusChange = useServerAction(updateProjectStatus, {
    success: "Status updated",
    successDescription: (data) =>
      `Project marked as ${data.status.replace(/_/g, " ").toLowerCase()}.`,
    failure: "Update failed",
  });

  const remove = useServerAction(deleteProject, {
    success: "Project deleted",
    successDescription: () => "The project has been removed.",
    failure: "Delete failed",
    refresh: false,
    onError: () => setIsDeleting(false),
    onThrown: () => setIsDeleting(false),
    onSuccess: () => {
      setIsDeleting(false);
      router.push("/dashboard/projects");
    },
  });

  const handleProjectStatusChange = async (newStatus: string) => {
    if (newStatus === project.status) return;
    await statusChange.run({
      id: project.id,
      status: newStatus as
        | "PLANNING"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED",
    });
  };

  const handleDeleteProject = async () => {
    await remove.run({ id: project.id });
  };

  return (
    <div className="workspace-page space-y-6">
      {/* Navigation Breadcrumb */}
      <nav className="text-muted-foreground flex items-center gap-2 text-xs">
        <Link
          href="/dashboard/projects"
          className="hover:text-foreground transition-colors"
        >
          Projects
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{project.name}</span>
      </nav>

      {/* Project Header Card */}
      <Card className="shadow-xs">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {project.name}
                </h1>
                <ProjectStatusBadge status={project.status} />
              </div>
              {project.description && (
                <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
                  {project.description}
                </p>
              )}
            </div>

            {/* Project Actions */}
            <div className="flex items-center gap-2">
              {/* Status Change Select — editors only */}
              {permissions.canEditProject && (
                <Select
                  value={project.status}
                  onValueChange={(val) => {
                    if (val) handleProjectStatusChange(val);
                  }}
                  disabled={statusChange.pending}
                >
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PROJECT_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}

              {/* Edit Project — editors only */}
              {permissions.canEditProject && (
                <EditProjectDialog
                  project={{
                    id: project.id,
                    name: project.name,
                    description: project.description ?? null,
                    progress: project.progress,
                    startDate: project.startDate ?? null,
                    dueDate: project.dueDate ?? null,
                  }}
                />
              )}

              {/* Invite Client Button — quality gate: leads only */}
              {permissions.canSubmitForReview && (
                <InviteClientDialog
                  projectId={project.id}
                  clientName={project.client.name}
                  clientEmail={project.client.email}
                />
              )}

              {/* Delete Project Button */}
              {permissions.isWorkspaceOwner && permissions.canDeleteProject && (
                <Button
                  variant="destructive"
                  size="sm"
                  aria-label="Delete project"
                  onClick={() => setIsDeleting(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Project Meta Bar */}
          <div className="border-border text-muted-foreground grid grid-cols-2 gap-4 border-t pt-4 text-xs md:grid-cols-4">
            <div>
              <span className="mb-1 block">Client</span>
              <span className="text-foreground flex items-center gap-1.5 font-medium">
                <User className="h-3.5 w-3.5" />
                {project.client.company || project.client.name}
              </span>
            </div>
            <div>
              <span className="mb-1 block">Due Date</span>
              <span className="text-foreground flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(project.dueDate)}
              </span>
            </div>
            <div>
              <Progress value={project.progress}>
                <span className="mb-1 block">Progress — {project.progress}%</span>
              </Progress>
            </div>
            <div>
              <span className="mb-1 block">Deliverables</span>
              <span className="text-foreground font-medium">
                {deliverables.length} Total
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="tasks">
            <ListTodo />
            Tasks ({initialTasks.length})
          </TabsTrigger>
          <TabsTrigger value="deliverables">
            <FileCheck />
            Deliverables ({deliverables.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            <MessageSquare />
            Requests ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt />
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <ActivityIcon />
            Activity ({activities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <TasksTab
            projectId={project.id}
            initialTasks={initialTasks}
            canManage={permissions.canManageDeliverables}
          />
        </TabsContent>
        <TabsContent value="deliverables" className="mt-4">
          <DeliverablesTab
            deliverables={deliverables}
            projectId={project.id}
            permissions={permissions}
            currentUserId={currentUserId}
          />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <RequestsTab requests={requests} permissions={permissions} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab
            invoices={invoices}
            permissions={permissions}
            projectId={project.id}
            approvedDeliverables={data.approvedDeliverables}
            projectClient={project.client}
            userProfile={data.userProfile}
          />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab activities={activities} />
        </TabsContent>
      </Tabs>

      {/* Delete Project Confirm Dialog */}
      <DeleteConfirmDialog
        open={isDeleting}
        onOpenChange={setIsDeleting}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description={`Deleting "${project.name}" permanently removes its deliverables, requests, tasks, files, access links, and activity. Uploaded storage objects may need separate cleanup. Projects with invoices cannot be deleted, so financial history is preserved. This action cannot be undone.`}
        isDeleting={remove.pending}
      />
    </div>
  );
}
