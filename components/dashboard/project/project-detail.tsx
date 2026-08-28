"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { toast } from "@/components/ui/toast";
import type { ProjectDetailProps } from "./types";
import { PROJECT_STATUS_OPTIONS, ProjectStatusBadge } from "./status-badges";
import { formatDate } from "./format";
import { TasksTab } from "./tasks-tab";
import { DeliverablesTab } from "./deliverables-tab";
import { RequestsTab } from "./requests-tab";
import { InvoicesTab, ActivityTab } from "./invoices-activity-tabs";
import { InviteClientDialog } from "./invite-client-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { EditProjectDialog } from "./edit-project-dialog";
import { updateProjectStatus, deleteProject } from "@/lib/actions/project";

export function ProjectDetail({ data, permissions, initialTasks }: ProjectDetailProps) {
  const { project, deliverables, requests, invoices, activities } = data;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const router = useRouter();

  const handleProjectStatusChange = async (newStatus: string) => {
    if (newStatus === project.status) return;
    setIsUpdatingStatus(true);
    try {
      const result = await updateProjectStatus({
        id: project.id,
        status: newStatus as
          | "PLANNING"
          | "IN_PROGRESS"
          | "COMPLETED"
          | "CANCELLED",
      });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Update failed",
          description: result.message,
        });
      } else {
        toast.add({
          type: "success",
          title: "Status updated",
          description: `Project marked as ${newStatus.replace(/_/g, " ").toLowerCase()}.`,
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsUpdatingStatus(false);
      router.refresh();
    }
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProject({ id: project.id });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Delete failed",
          description: result.message,
        });
      } else {
        toast.add({
          type: "success",
          title: "Project deleted",
          description: "The project has been removed.",
        });
        router.push("/dashboard/projects");
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl space-y-6 p-4 md:p-6">
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
                  disabled={isUpdatingStatus}
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
              {permissions.canDeleteProject && (
                <Button
                  variant="destructive"
                  size="sm"
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
      <Tabs defaultValue="tasks">
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
          />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <RequestsTab requests={requests} permissions={permissions} />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab invoices={invoices} />
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
        description={`Are you sure you want to delete "${project.name}"? This will also delete all deliverables, requests, invoices, and activity. This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
