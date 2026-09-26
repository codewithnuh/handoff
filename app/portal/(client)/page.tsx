import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePortalSession } from "@/lib/access";
import { getPortalHomeProjects } from "@/lib/queries/portal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  FileCheck,
  MessageSquare,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { formatDate } from "@/lib/presentational/format";
import { EmptyState } from "@/components/presentational/empty-state";
import {
  PROJECT_STATUS_OPTIONS,
  projectStatusOption,
} from "@/lib/presentational/status";

export default async function PortalHomePage() {
  const session = await requirePortalSession();
  if (!session.ok) {
    redirect("/portal/expired");
  }

  const projects = await getPortalHomeProjects(session.value.email);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here are the projects you have access to.
        </p>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <EmptyState
          size="lg"
          icon={<Inbox className="size-6 text-muted-foreground" />}
          title="No projects yet"
          description="The project owner hasn't shared any projects with you yet. Check back soon or ask them to send you an invitation link."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const statusConfig =
              projectStatusOption(project.status) ?? PROJECT_STATUS_OPTIONS[0];

            return (
              <Link
                key={project.id}
                href={`/portal/projects/${project.id}`}
                className="group block"
              >
                <Card className="shadow-xs h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        {project.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={statusConfig.variant}
                        className="text-[10px] shrink-0"
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium tabular-nums">
                          {project.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {formatDate(project.dueDate, "No due date")}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCheck className="size-3.5" />
                        {project._count.deliverables} deliverable
                        {project._count.deliverables !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3.5" />
                        {project._count.requests} request
                        {project._count.requests !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
