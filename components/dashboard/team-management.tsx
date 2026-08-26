"use client";

/**
 * TeamManagement — workspace members, pending invites, and per-project
 * assignments (need-to-know scoping).
 *
 * Admins/owner see everything; regular members see the roster read-only.
 * Leads manage assignments only for the projects they lead.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Copy,
  Check,
  MoreHorizontal,
  Trash2,
  Shield,
  ShieldOff,
  Link2,
  Crown,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import type {
  TeamMemberListResult,
  TeamInviteListResult,
} from "@/lib/actions/team";
import type { TeamAssignmentProject } from "@/lib/queries/project";
import {
  inviteTeammate,
  revokeTeamInvite,
  removeTeamMember,
  updateTeamMemberRole,
  updateProjectMemberRole,
  removeProjectMember,
  listProjectMembers,
} from "@/lib/actions/team";
import { useEffect } from "react";

const ROLE_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  OWNER: { label: "Owner", variant: "outline" },
  ADMIN: { label: "Admin", variant: "default" },
  MEMBER: { label: "Member", variant: "secondary" },
};

const PROJECT_ROLE_LABEL: Record<string, string> = {
  LEAD: "Lead",
  CONTRIBUTOR: "Contributor",
  OBSERVER: "Observer",
};

type Member = TeamMemberListResult["items"][number];
type Invite = TeamInviteListResult["items"][number];

interface TeamManagementProps {
  members: Member[];
  invites: Invite[];
  /** Caller can manage the roster (owner/admin) */
  isAdmin: boolean;
  currentUserId: string;
  /** Projects whose assignments this caller may manage */
  manageableProjects: TeamAssignmentProject[];
}

export function TeamManagement({
  members,
  invites,
  isAdmin,
  currentUserId,
  manageableProjects,
}: TeamManagementProps) {
  return (
    <div className="space-y-6">
      <MembersSection
        members={members}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />
      {isAdmin && <InvitesSection projects={manageableProjects} invites={invites} />}


      {manageableProjects.length > 0 && (
        <AssignmentsSection projects={manageableProjects} members={members} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Members roster
// ──────────────────────────────────────────────

function MembersSection({
  members,
  isAdmin,
  currentUserId,
}: {
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const handleRoleChange = async (userId: string, role: string) => {
    setBusyId(userId);
    try {
      const result = await updateTeamMemberRole({
        userId,
        role: role as "ADMIN" | "MEMBER",
      });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Update failed",
          description: result.message,
        });
        return;
      }
      toast.add({ type: "success", title: "Role updated" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setBusyId(removeTarget.userId);
    try {
      const result = await removeTeamMember({ userId: removeTarget.userId });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't remove member",
          description: result.message,
        });
        return;
      }
      toast.add({ type: "success", title: `${removeTarget.name} removed` });
      setRemoveTarget(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Members</CardTitle>
        <span className="text-[10px] text-muted-foreground">
          admins manage everything · members see assigned projects only
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.map((m) => {
          const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE.MEMBER;
          const isSelf = m.userId === currentUserId;
          const isOwnerRow = m.role === "OWNER";
          return (
            <div
              key={m.userId}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {m.name}
                    {isSelf && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (you)
                      </span>
                    )}
                  </span>
                  <Badge variant={badge.variant} className="text-[10px] gap-1">
                    {m.role === "OWNER" && <Crown className="size-3" />}
                    {badge.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {m.email}
                </p>
              </div>

              {isAdmin && !isSelf && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    {!isOwnerRow && (
                      <>
                        <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
                          Change role
                        </div>
                        <DropdownMenuItem
                          disabled={
                            busyId === m.userId || m.role === "ADMIN"
                          }
                          onClick={() => handleRoleChange(m.userId, "ADMIN")}
                        >
                          <Shield className="mr-2 h-3.5 w-3.5" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={
                            busyId === m.userId || m.role === "MEMBER"
                          }
                          onClick={() => handleRoleChange(m.userId, "MEMBER")}
                        >
                          <ShieldOff className="mr-2 h-3.5 w-3.5" />
                          Set as Member
                        </DropdownMenuItem>
                      </>
                    )}
                    {!isOwnerRow && (
                      <>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={busyId === m.userId}
                          onClick={() => setRemoveTarget(m)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Remove from workspace
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </CardContent>

      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
            <DialogDescription>
              {removeTarget?.name} will lose access to this workspace and every
              assigned project. Their account stays active elsewhere.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Pending invites
// ──────────────────────────────────────────────

function InvitesSection({
  invites,
  projects,
}: {
  invites: Invite[];
  projects: TeamAssignmentProject[];
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.add({ type: "success", title: "Link copied" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.add({
        type: "error",
        title: "Couldn't copy",
        description: "Copy it manually.",
      });
    }
  };

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const result = await inviteTeammate({
        email: email.trim(),
        projectIds: selectedProjects,
      });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't create invite",
          description: result.message,
        });
        return;
      }
      setLink(result.data.acceptUrl);
      toast.add({
        type: "success",
        title: "Invite created",
        description: "Copy the link and share it.",
      });
      router.refresh();
    } catch {
      toast.add({ type: "error", title: "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const result = await revokeTeamInvite({ id });
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Couldn't revoke",
        description: result.message,
      });
      return;
    }
    toast.add({ type: "success", title: "Invite revoked" });
    router.refresh();
  };

  const closeDialog = (open: boolean) => {
    setInviteOpen(open);
    if (!open) {
      setEmail("");
      setSelectedProjects([]);
      setLink(null);
    }
  };

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Invites</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Invite Teammate
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {invites.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No invites yet.
          </p>
        ) : (
          invites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <Badge
                    variant={
                      inv.status === "ACCEPTED"
                        ? "outline"
                        : inv.status === "PENDING"
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {inv.status === "ACCEPTED"
                      ? "Accepted ✓"
                      : inv.status === "PENDING"
                        ? "Pending"
                        : "Expired"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {inv.status === "ACCEPTED"
                    ? `Joined ${new Date(
                        inv.acceptedAt ?? inv.createdAt,
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}`
                    : `Sent ${new Date(inv.createdAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )} · expires ${new Date(inv.expiresAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}`}
                </p>
              </div>
              {inv.status === "PENDING" && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => copy(inv.id, inv.acceptUrl)}
                  >
                    {copiedId === inv.id ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRevoke(inv.id)}
                  >
                    <X className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={inviteOpen} onOpenChange={closeDialog}>
        <DialogContent className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              Generate a link your teammate uses to set their password and join.
              Pick the projects they should see — they won&apos;t have access to
              anything else.
            </DialogDescription>
          </DialogHeader>

          {link ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
                <Link2 className="size-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground truncate flex-1 font-mono">
                  {link}
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => copy("new", link)}
                >
                  {copiedId === "new" ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires in 7 days and can be used once.
              </p>
            </div>
          ) : (
            <div className="space-y-4 mt-1">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-teammate-email">Email</Label>
                <Input
                  id="invite-teammate-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@example.com"
                />
              </div>

              {projects.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Project access</Label>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border">
                    {projects.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(p.id)}
                          onChange={() => toggleProject(p.id)}
                          className="accent-primary"
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Leave unchecked to invite them with no project access yet.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog(false)}>
              {link ? "Done" : "Cancel"}
            </Button>
            {!link && (
              <Button onClick={handleInvite} disabled={submitting || !email.trim()}>
                {submitting ? "Creating..." : "Create Invite"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Per-project assignments (need-to-know)
// ──────────────────────────────────────────────

function AssignmentsSection({
  projects,
  members,
}: {
  projects: TeamAssignmentProject[];
  members: Member[];
}) {
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
        toast.add({ type: "error", title: "Couldn't update", description: result.message });
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
        toast.add({ type: "error", title: "Couldn't remove", description: result.message });
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
          <Select
            value={projectId}
            onValueChange={(v) => v && setProjectId(v)}
          >
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

        <div className="rounded-md border border-border min-h-[80px]" data-loading={loading}>
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
          <Select value={assignUser} onValueChange={(v) => v && setAssignUser(v)}>
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
          <Select value={assignRole} onValueChange={(v) => v && setAssignRole(v)}>
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
