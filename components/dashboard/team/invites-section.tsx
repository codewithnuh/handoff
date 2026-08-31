"use client";

/**
 * InvitesSection — pending team invitations with invite dialog,
 * link copying, and revocation.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Copy,
  Check,
  Link2,
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
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import type { TeamInviteListResult } from "@/lib/actions/team";
import type { TeamAssignmentProject } from "@/lib/queries/project";
import {
  inviteTeammate,
  revokeTeamInvite,
} from "@/lib/actions/team";
import type { WorkspacePermission } from "@/app/generated/prisma/client";

type Invite = TeamInviteListResult["items"][number];

interface InvitesSectionProps {
  invites: Invite[];
  projects: TeamAssignmentProject[];
}

export function InvitesSection({
  invites,
  projects,
}: InvitesSectionProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
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

  const togglePermission = (perm: string) => {
    setInvitePermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const result = await inviteTeammate({
        email: email.trim(),
        projectIds: selectedProjects,
        role: inviteRole as "ADMIN" | "MEMBER",
        permissions: invitePermissions as WorkspacePermission[],
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
      setInviteRole("MEMBER");
      setInvitePermissions([]);
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

              <div className="flex flex-col gap-1.5">
                <Label>Workspace role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => v && setInviteRole(v)}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-[10px]">
                  Admins can manage the workspace. Members see assigned projects
                  only.
                </p>
              </div>

              {inviteRole === "MEMBER" && (
                <div className="space-y-1.5">
                  <Label>Permissions</Label>
                  <div className="border-border divide-border max-h-40 divide-y overflow-y-auto rounded-md border">
                    {[
                      { value: "MANAGE_WORKSPACE", label: "Manage workspace", description: "Rename workspace and change settings" },
                      { value: "MANAGE_MEMBERS", label: "Manage members", description: "Invite, remove, and change member roles" },
                      { value: "MANAGE_CLIENTS", label: "Manage clients", description: "Create, edit, and delete clients" },
                      { value: "MANAGE_PROJECTS", label: "Manage projects", description: "Edit project details and settings" },
                      { value: "CREATE_PROJECTS", label: "Create projects", description: "Create new projects in the workspace" },
                      { value: "VIEW_ALL_PROJECTS", label: "View all projects", description: "See all projects, not just assigned ones" },
                      { value: "MANAGE_BILLING", label: "Manage billing", description: "Access billing and subscription settings" },
                    ].map((perm) => (
                      <label
                        key={perm.value}
                        className="hover:bg-muted/50 flex cursor-pointer items-start gap-2.5 px-3 py-2 text-xs"
                      >
                        <Checkbox
                          checked={invitePermissions.includes(perm.value)}
                          onCheckedChange={() => togglePermission(perm.value)}
                          aria-label={perm.label}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{perm.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    Extra permissions beyond default member access.
                  </p>
                </div>
              )}

              {projects.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Project access</Label>
                  <div className="border-border divide-border max-h-40 divide-y overflow-y-auto rounded-md border">
                    {projects.map((p) => (
                      <label
                        key={p.id}
                        className="hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 px-3 py-2 text-xs"
                      >
                        <Checkbox
                          checked={selectedProjects.includes(p.id)}
                          onCheckedChange={() => toggleProject(p.id)}
                          aria-label={`Grant access to ${p.name}`}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-[10px]">
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
              <Button
                onClick={handleInvite}
                disabled={submitting || !email.trim()}
              >
                {submitting ? "Creating..." : "Create Invite"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
