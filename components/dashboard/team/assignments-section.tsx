"use client";

/**
 * AssignmentsSection — per-project role assignments (need-to-know scoping).
 * Leads manage assignments for their projects; admins see all.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import type { TeamMemberListResult } from "@/lib/actions/team";
import type { TeamAssignmentProject } from "@/lib/queries/project";
import {
  updateProjectMemberRole,
  removeProjectMember,
  listProjectMembers,
} from "@/lib/actions/team";
import { PROJECT_ROLE_LABEL } from "@/components/dashboard/team/constants";

type Member = TeamMemberListResult["items"][number];

interface AssignmentsSectionProps {
  projects: TeamAssignmentProject[];
  members: Member[];
}

export function AssignmentsSection({
  projects,
  members,
}: AssignmentsSectionProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [rows, setRows] = useState<
    { userId: string; name: string; email: string; role: string }[] | null
  >(null);
  const [assignUser, setAssignUser] = useState("");
  const [assignRole, setAssignRole] = useState("CONTRIBUTOR");
  const [loading, setLoading] = useState(false);

  const assignable = members.filter((m) => m.role !== "OWNER");

  const loadRows = async (pid: string) => {
    if (!pid) return;
    setLoading(true);
    try {
      const result = await listProjectMembers({ projectId: pid });
      if (result.success) {
        setRows(result.data.items);
      } else {
        toast.add({ type: "error", title: "Couldn't load assignments" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Load rows when the project changes. State updates happen after the
  // await (never synchronously inside the effect).
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void (async () => {
      const result = await listProjectMembers({ projectId });
      if (cancelled) return;
      if (result.success) {
        setRows(result.data.items);
      } else {
        toast.add({ type: "error", title: "Couldn't load assignments" });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleAssign = async () => {
    if (!projectId || !assignUser) return;
    setLoading(true);
    try {
      const result = await updateProjectMemberRole({
        projectId,
        userId: assignUser,
        role: assignRole as "LEAD" | "CONTRIBUTOR" | "OBSERVER",
      });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't assign",
          description: result.message,
        });
        return;
      }
      toast.add({ type: "success", title: "Assignment saved" });
      setAssignUser("");
      setAssignRole("CONTRIBUTOR");
      await loadRows(projectId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setLoading(true);
    try {
      const result = await updateProjectMemberRole({
        projectId,
        userId,
        role: role as "LEAD" | "CONTRIBUTOR" | "OBSERVER",
      });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't update",
          description: result.message,
        });
        return;
      }
      await loadRows(projectId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setLoading(true);
    try {
      const result = await removeProjectMember({ projectId, userId });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't remove",
          description: result.message,
        });
        return;
      }
      await loadRows(projectId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const memberName = (userId: string) =>
    members.find((m) => m.userId === userId)?.name ?? userId;

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Project Access</CardTitle>
        <p className="text-[10px] text-muted-foreground">
          who can see each project — Lead edits &amp; submits, Contributor works
          drafts, Observer views only
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length > 1 && (
          <Select value={projectId} onValueChange={(v) => v && setProjectId(v)}>
            <SelectTrigger className="w-[240px] h-8 text-xs">
              <SelectValue placeholder="Choose project" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}

        <div
          className="rounded-md border border-border min-h-[80px]"
          data-loading={loading}
        >
          {rows === null || loading ? (
            <p className="text-xs text-muted-foreground p-4 text-center">
              Loading…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">
              Nobody assigned yet — only you (and admins) can see this project.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div
                  key={r.userId}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {memberName(r.userId)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {r.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={r.role}
                      onValueChange={(v) => v && handleRoleChange(r.userId, v)}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-[120px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(Object.keys(PROJECT_ROLE_LABEL) as string[]).map(
                            (role) => (
                              <SelectItem key={role} value={role}>
                                {PROJECT_ROLE_LABEL[role]}
                              </SelectItem>
                            ),
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={loading}
                      onClick={() => handleRemove(r.userId)}
                    >
                      <X className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={assignUser}
            onValueChange={(v) => v && setAssignUser(v)}
          >
            <SelectTrigger className="w-full sm:w-[220px] h-8 text-xs">
              <SelectValue placeholder="Add member…" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {assignable.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={assignRole}
            onValueChange={(v) => v && setAssignRole(v)}
          >
            <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(Object.keys(PROJECT_ROLE_LABEL) as string[]).map((role) => (
                  <SelectItem key={role} value={role}>
                    {PROJECT_ROLE_LABEL[role]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={!assignUser || !projectId || loading}
          >
            Assign
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
