"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FolderKanban, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const status =
              projectStatusOption(project.status) ?? PROJECT_STATUS_OPTIONS[0];

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

                    <div className="border-border mt-4 space-y-3 border-t pt-3">
                      {/* Progress Bar */}
                      <Progress value={project.progress}>
                        <div className="text-muted-foreground mb-1 flex justify-between text-xs">
                          <span>Progress</span>
                          <span className="text-foreground font-medium">
                            {project.progress}%
                          </span>
                        </div>
                      </Progress>

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
