"use client";

import React, { useState } from "react";
import {
  Shield,
  ShieldOff,
  CheckCircle2,
  XCircle,
  Link2,
  Copy,
  Check,
  Clock,
  MoreHorizontal,
  Send,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/presentational/empty-state";
import { revokeClientAccess, inviteClient } from "@/lib/actions/invitation";
import { useServerAction } from "@/hooks/use-server-action";
import type { PortalClientData } from "@/lib/queries/portal";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type ProjectOption = {
  id: string;
  name: string;
  client: { name: string; email: string } | null;
};

interface PortalManagementProps {
  portalClients: PortalClientData[];
  projects: ProjectOption[];
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function PortalManagement({
  portalClients,
  projects,
}: PortalManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<PortalClientData | null>(
    null,
  );

  // Invite state
  const [inviteTarget, setInviteTarget] = useState<PortalClientData | null>(
    null,
  );
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const revoke = useServerAction(revokeClientAccess, {
    failure: "Couldn't revoke access",
    refresh: false,
  });

  const invite = useServerAction(inviteClient, {
    success: "Invitation created",
    successDescription: () => "Copy the link and share it with your client.",
    failure: "Couldn't create invitation",
    refresh: false,
    onSuccess: (data) => setInviteLink(data.acceptUrl),
  });

  const filteredClients = portalClients.filter((client) => {
    const q = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q)
    );
  });

  const activeCount = portalClients.filter((c) => c.hasAccess).length;

  const handleRevoke = async () => {
    if (!revokeTarget) return;

    for (const project of revokeTarget.projects) {
      const result = await revoke.run({
        projectId: project.id,
        email: revokeTarget.email,
      });
      if (!result?.success) return;
    }

    if (revokeTarget.projects.length === 0) {
      toast.add({
        type: "info",
        title: "No portal access to revoke",
        description: "This client hasn't accepted any invitations yet.",
      });
      setRevokeTarget(null);
      return;
    }

    toast.add({
      type: "success",
      title: "Access revoked",
      description: `${revokeTarget.name ?? revokeTarget.email} has been removed from all projects.`,
    });
    setRevokeTarget(null);
  };

  const handleInvite = async () => {
    if (!inviteTarget || !selectedProjectId) return;
    setInviteLink(null);
    setCopied(false);
    await invite.run({
      projectId: selectedProjectId,
      email: inviteTarget.email,
    });
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.add({
        type: "success",
        title: "Link copied",
        description: "Paste it into a message to share with your client.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({
        type: "error",
        title: "Couldn't copy",
        description: "Please copy the link manually.",
      });
    }
  };

  const resetInviteDialog = () => {
    setInviteTarget(null);
    setSelectedProjectId("");
    setInviteLink(null);
    setCopied(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Users className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">
                  {portalClients.length}
                </p>
                <p className="text-xs text-muted-foreground">Total clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active portals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-yellow-500/10">
                <Clock className="size-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">
                  {portalClients.length - activeCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pending invitations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Shield className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">
                  {projects.length}
                </p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            Portal Clients
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {activeCount} / {portalClients.length} active
          </Badge>
        </CardHeader>
        <CardContent>
          {/* Search */}
          {portalClients.length > 3 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients..."
                className="pl-9"
              />
            </div>
          )}

          {filteredClients.length === 0 ? (
            <EmptyState
              showIconCircle={false}
              icon={
                <Users className="mx-auto size-8 text-muted-foreground" />
              }
              title="No clients yet"
              description="Add clients from the Clients page, then invite them to projects here."
            />
          ) : (
            <div className="divide-y divide-border">
              {filteredClients.map((client) => (
                <div
                  key={client.email}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                        client.hasAccess ? "bg-green-500/10" : "bg-muted"
                      }`}
                    >
                      {client.hasAccess ? (
                        <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {client.name ?? client.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.email}
                        {client.projects.length > 0 && (
                          <span className="ml-1.5">
                            · {client.projects.length} project
                            {client.projects.length !== 1 ? "s" : ""}:
                            {" "}
                            {client.projects.map((p) => p.name).join(", ")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {client.hasAccess ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-green-600 dark:text-green-400 border-green-500/30"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Invited
                      </Badge>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            resetInviteDialog();
                            setInviteTarget(client);
                          }}
                        >
                          <Send className="mr-2 h-3.5 w-3.5" />
                          Invite to Project
                        </DropdownMenuItem>
                        {client.hasAccess && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setRevokeTarget(client)}
                            >
                              <ShieldOff className="mr-2 h-3.5 w-3.5" />
                              Revoke Access
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite to Project Dialog */}
      {inviteTarget && (
        <Dialog
          open={!!inviteTarget}
          onOpenChange={(open) => {
            if (!open) resetInviteDialog();
          }}
        >
          <DialogContent className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Invite {inviteTarget.name ?? inviteTarget.email}</DialogTitle>
              <DialogDescription>
                Select a project to generate an invitation link for.
              </DialogDescription>
            </DialogHeader>

            {inviteLink ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
                  <Link2 className="size-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground truncate flex-1 font-mono">
                    {inviteLink}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleCopyLink(inviteLink)}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link expires in 7 days. Share it via email, Slack, or any
                  messaging app.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Select project</label>
                  <Select
                    value={selectedProjectId}
                    onValueChange={(val) => setSelectedProjectId(val ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Client email</label>
                  <Input
                    value={inviteTarget.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {inviteLink ? "Done" : "Cancel"}
              </DialogClose>
              {!inviteLink && (
                <Button
                  onClick={handleInvite}
                  disabled={invite.pending || !selectedProjectId}
                >
                  {invite.pending ? "Creating..." : "Create Invite Link"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke portal access?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.name ?? revokeTarget?.email} will immediately lose
              access to{" "}
              {revokeTarget?.projects.length ?? 0} project
              {revokeTarget?.projects.length !== 1 ? "s" : ""}. All of their
              active portal sessions are terminated and their links stop
              working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoke.pending}
            >
              {revoke.pending ? "Revoking..." : "Revoke Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
