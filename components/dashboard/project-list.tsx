"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FolderKanban, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ProjectListItem } from "@/lib/queries/dashboard";
import { EmptyState } from "@/components/presentational/empty-state";
import {
  PROJECT_STATUS_OPTIONS,
  projectStatusOption,
} from "@/lib/presentational/status";
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

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  ...PROJECT_STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
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
      <EmptyState
        showIconCircle={false}
        icon={
          <FolderKanban className="mx-auto size-8 text-muted-foreground" />
        }
        title="No projects yet"
        description="Create your first project from the dashboard to get started."
      />
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
        <div className="project-list">
          {filteredProjects.map((project) => {
            const status =
              projectStatusOption(project.status) ?? PROJECT_STATUS_OPTIONS[0];

            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="project-list-row"
              >
                <span className="project-list-mark" aria-hidden="true">
                  <FolderKanban className="size-4" />
                </span>
                <span className="project-list-main">
                  <strong>{project.name}</strong>
                  <small>{project.client.company || project.client.name}</small>
                </span>
                <span className="project-list-status">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </span>
                <span className="project-list-progress">
                  <span className="project-progress-label">
                    <span>Progress</span><strong>{project.progress}%</strong>
                  </span>
                  <Progress value={project.progress} />
                </span>
                <span className="project-list-meta">
                  <span><Calendar className="size-3.5" />
                    {project.dueDate
                      ? new Date(project.dueDate).toLocaleDateString()
                      : "No due date"}
                  </span>
                  <small>{project._count.deliverables} deliverable{project._count.deliverables !== 1 ? "s" : ""}</small>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          showIconCircle={false}
          icon={
            <FolderKanban className="mx-auto size-8 text-muted-foreground" />
          }
          title="No projects found"
          description="Try adjusting your search criteria or clear filters to see more results."
        >
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
        </EmptyState>
      )}
    </div>
  );
}
