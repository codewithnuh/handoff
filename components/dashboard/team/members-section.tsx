"use client";

/**
 * MembersSection — workspace member roster with role management,
 * permissions dialog, and member removal.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Trash2,
  Shield,
  ShieldOff,
  Crown,
  Key,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import type { TeamMemberListResult } from "@/lib/actions/team";
import {
  removeTeamMember,
  updateTeamMemberRole,
  updateMemberPermissions,
} from "@/lib/actions/team";
import type { WorkspacePermission } from "@/app/generated/prisma/client";
import {
  ALL_PERMISSIONS,
  ROLE_BADGE,
} from "@/components/dashboard/team/constants";

type Member = TeamMemberListResult["items"][number];

interface MembersSectionProps {
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
  permissions: WorkspacePermission[];
}

export function MembersSection({
  members,
  isAdmin,
  currentUserId,
  permissions = [],
}: MembersSectionProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [permissionsTarget, setPermissionsTarget] = useState<Member | null>(
    null,
  );
  const [editingPermissions, setEditingPermissions] = useState<
    WorkspacePermission[]
  >([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const canManageMembers = isAdmin || permissions.includes("MANAGE_MEMBERS");

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

  const openPermissions = (member: Member) => {
    setPermissionsTarget(member);
    setEditingPermissions([...member.permissions]);
  };

  const togglePermission = (perm: WorkspacePermission) => {
    setEditingPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleSavePermissions = async () => {
    if (!permissionsTarget) return;
    setSavingPermissions(true);
    try {
      const result = await updateMemberPermissions({
        userId: permissionsTarget.userId,
        permissions: editingPermissions,
      });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't update permissions",
          description: result.message,
        });
        return;
      }
      toast.add({ type: "success", title: "Permissions updated" });
      setPermissionsTarget(null);
      router.refresh();
    } finally {
      setSavingPermissions(false);
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
                  {!isOwnerRow && m.permissions.length > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Key className="size-2.5" />
                      {m.permissions.length} perm
                      {m.permissions.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {m.email}
                </p>
              </div>

              {canManageMembers && !isSelf && (
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
                          disabled={busyId === m.userId || m.role === "ADMIN"}
                          onClick={() => handleRoleChange(m.userId, "ADMIN")}
                        >
                          <Shield className="mr-2 h-3.5 w-3.5" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={busyId === m.userId || m.role === "MEMBER"}
                          onClick={() => handleRoleChange(m.userId, "MEMBER")}
                        >
                          <ShieldOff className="mr-2 h-3.5 w-3.5" />
                          Set as Member
                        </DropdownMenuItem>
                      </>
                    )}
                    {!isOwnerRow && m.role === "MEMBER" && (
                      <>
                        <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
                          Permissions
                        </div>
                        <DropdownMenuItem
                          disabled={busyId === m.userId}
                          onClick={() => openPermissions(m)}
                        >
                          <Key className="mr-2 h-3.5 w-3.5" />
                          Manage permissions
                          {m.permissions.length > 0 && (
                            <Badge
                              variant="secondary"
                              className="ml-auto text-[10px]"
                            >
                              {m.permissions.length}
                            </Badge>
                          )}
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

      <Dialog
        open={!!permissionsTarget}
        onOpenChange={(open) => !open && setPermissionsTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage permissions</DialogTitle>
            <DialogDescription>
              {permissionsTarget?.role === "ADMIN"
                ? "Admins have full workspace access. These are additional granular permissions."
                : `Set what ${permissionsTarget?.name} can do beyond default member access.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 max-h-80 overflow-y-auto py-1">
            {ALL_PERMISSIONS.map((perm) => (
              <label
                key={perm.value}
                className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5"
              >
                <Checkbox
                  checked={editingPermissions.includes(perm.value)}
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermissionsTarget(null)}
              disabled={savingPermissions}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={savingPermissions}
            >
              {savingPermissions ? "Saving..." : "Save permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
