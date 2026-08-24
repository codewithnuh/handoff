"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FolderKanban, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectListItem } from "@/lib/queries/project";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "../ui/select";

type ClientFilter = { id: string; name: string };

interface ProjectListProps {
  projects: ProjectListItem[];
  clients: ClientFilter[];
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  PLANNING: { label: "Planning", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  COMPLETED: { label: "Completed", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PLANNING", label: "Planning" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function ProjectList({ projects, clients }: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description &&
          project.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const matchesClient =
        selectedClientId === "ALL" || project.client.id === selectedClientId;
      const matchesStatus =
        selectedStatus === "ALL" || project.status === selectedStatus;

      return matchesSearch && matchesClient && matchesStatus;
    });
  }, [projects, searchQuery, selectedClientId, selectedStatus]);

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedClientId !== "ALL" ||
    selectedStatus !== "ALL";

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
        <FolderKanban className="mx-auto size-8 text-muted-foreground" />
        <h3 className="mt-3 text-sm font-semibold">No projects yet</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first project from the dashboard to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Client Select */}
          <Select
            value={selectedClientId}
            onValueChange={(val) => setSelectedClientId(val ?? "ALL")}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue>
                {(value) => {
                  if (!value || value === "ALL") {
                    return "All Clients";
                  }

                  return (
                    clients.find((client) => client.id === value)?.name ??
                    "All Clients"
                  );
                }}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectItem value="ALL">All Clients</SelectItem>

                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Status Select */}
          <Select
            value={selectedStatus}
            onValueChange={(val) => setSelectedStatus(val ?? "ALL")}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const status =
              statusConfig[project.status] ?? statusConfig.PLANNING;

            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="group block"
              >
                <Card className="shadow-xs h-full transition-shadow group-hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground truncate max-w-[70%]">
                      {project.client.company || project.client.name}
                    </CardTitle>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </CardHeader>

                  <CardContent>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {project.description || "No description provided."}
                    </p>

                    <div className="mt-4 pt-3 border-t border-border space-y-3">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span className="font-medium text-foreground">
                            {project.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Metadata Row */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {project.dueDate
                              ? new Date(project.dueDate).toLocaleDateString()
                              : "No due date"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FolderKanban className="h-3.5 w-3.5" />
                          <span>
                            {project._count.deliverables} Deliverable
                            {project._count.deliverables !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
          <FolderKanban className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold">No projects found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search criteria or clear filters to see more
            results.
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedClientId("ALL");
                setSelectedStatus("ALL");
              }}
              className="mt-4"
            >
              Reset all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
