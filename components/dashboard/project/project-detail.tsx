"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import type { TabKey, ProjectDetailProps } from "./types";
import { PROJECT_STATUS_OPTIONS, ProjectStatusBadge } from "./status-badges";
import { formatDate } from "./format";
import { TasksTab } from "./tasks-tab";
import { DeliverablesTab } from "./deliverables-tab";
import { RequestsTab } from "./requests-tab";
import { InvoicesTab, ActivityTab } from "./invoices-activity-tabs";
import { InviteClientDialog } from "./invite-client-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { updateProjectStatus, deleteProject } from "@/lib/actions/project";

export function ProjectDetail({ data, permissions, initialTasks }: ProjectDetailProps) {
  const { project, deliverables, requests, invoices, activities } = data;
  const [activeTab, setActiveTab] = useState<TabKey>("deliverables");
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  const tabs: {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    count: number;
  }[] = [
    {
      key: "tasks",
      label: "Tasks",
      icon: <ListTodo className="h-4 w-4" />,
      count: initialTasks.length,
    },
    {
      key: "deliverables",
      label: "Deliverables",
      icon: <FileCheck className="h-4 w-4" />,
      count: deliverables.length,
    },
    {
      key: "requests",
      label: "Client Requests",
      icon: <MessageSquare className="h-4 w-4" />,
      count: requests.length,
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: <Receipt className="h-4 w-4" />,
      count: invoices.length,
    },
    {
      key: "activity",
      label: "Activity Log",
      icon: <ActivityIcon className="h-4 w-4" />,
      count: activities.length,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/dashboard/projects"
          className="hover:text-foreground transition-colors"
        >
          Projects
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-foreground">{project.name}</span>
      </nav>

      {/* Project Header Card */}
      <Card className="shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {project.name}
                </h1>
                <ProjectStatusBadge status={project.status} />
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
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
                  <SelectTrigger className="w-[140px] h-8">
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
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Project Meta Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border text-xs">
            <div>
              <span className="text-muted-foreground block mb-1">Client</span>
              <span className="font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {project.client.company || project.client.name}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Due Date</span>
              <span className="font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(project.dueDate)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Progress</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="font-medium">{project.progress}%</span>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">
                Deliverables
              </span>
              <span className="font-medium">{deliverables.length} Total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-6 text-sm font-medium overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 border-b-2 inline-flex items-center gap-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.icon}
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "tasks" && (
        <TasksTab
          projectId={project.id}
          initialTasks={initialTasks}
          canManage={permissions.canManageDeliverables}
        />
      )}
      {activeTab === "deliverables" && (
        <DeliverablesTab
          deliverables={deliverables}
          projectId={project.id}
          permissions={permissions}
        />
      )}
      {activeTab === "requests" && (
        <RequestsTab requests={requests} permissions={permissions} />
      )}
      {activeTab === "invoices" && <InvoicesTab invoices={invoices} />}
      {activeTab === "activity" && <ActivityTab activities={activities} />}

      {/* Delete Project Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description={`Are you sure you want to delete "${project.name}"? This will also delete all deliverables, requests, invoices, and activity. This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
