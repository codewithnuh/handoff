"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { createWorkspace, switchWorkspace } from "@/lib/actions/workspace";
import type { WorkspaceListItem } from "@/lib/actions/workspace";

interface WorkspaceSwitcherProps {
  /** Resolved on the server so there's no client-side loading flash. */
  workspaces: WorkspaceListItem[];
  className?: string;
}

export function WorkspaceSwitcher({
  workspaces,
  className,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const activeWorkspace = workspaces.find((ws) => ws.isActive) ?? workspaces[0];

  const handleSwitch = (workspaceId: string) => {
    if (workspaceId === activeWorkspace?.id) return;

    startTransition(async () => {
      const result = await switchWorkspace({ id: workspaceId });

      if (result.success) {
        toast.add({
          type: "success",
          title: "Workspace switched",
          description: result.message,
        });

        router.refresh();
      } else {
        toast.add({
          type: "error",
          title: "Couldn't switch workspace",
          description: result.message,
        });
      }
    });
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isCreating) return;

    setIsCreating(true);

    try {
      const result = await createWorkspace({
        name: newName.trim(),
      });

      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't create workspace",
          description: result.message,
        });

        return;
      }

      toast.add({
        type: "success",
        title: "Workspace created",
        description: `"${result.data.name}" is now your active workspace.`,
      });

      setCreateOpen(false);
      setNewName("");
      router.refresh();
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (workspaces.length === 0 || !activeWorkspace) {
    return null;
  }

  // Single workspace
  if (workspaces.length === 1) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div
          className={cn(
            "flex h-8 min-w-0 flex-1 items-center gap-2",
            "rounded-md border border-sidebar-border",
            "bg-sidebar-accent/60 px-3",
            "text-sidebar-foreground",
          )}
        >
          <Building2 className="size-4 shrink-0 text-sidebar-primary" />

          <span className="truncate text-sm font-medium">
            {activeWorkspace.name}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Create workspace"
          disabled={isPending}
          onClick={() => setCreateOpen(true)}
          className={cn(
            "size-8",
            "text-sidebar-foreground",
            "hover:bg-sidebar-accent",
            "hover:text-sidebar-accent-foreground",
          )}
        >
          <Plus className="size-4" />
        </Button>

        <CreateWorkspaceDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          newName={newName}
          setNewName={setNewName}
          isCreating={isCreating}
          onSubmit={handleCreate}
        />
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              disabled={isPending}
              className={cn(
                "h-8 w-full justify-between gap-2",
                "border-sidebar-border",
                "bg-sidebar-accent/60",
                "text-left font-normal",
                "text-sidebar-foreground",
                "hover:bg-sidebar-accent",
                "hover:text-sidebar-accent-foreground",
                className,
              )}
            >
              <span className="flex items-center gap-2 overflow-hidden">
                <Building2 className="size-4 shrink-0 text-sidebar-primary" />

                <span className="truncate text-sm">{activeWorkspace.name}</span>
              </span>

              <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/70" />
            </Button>
          }
        />

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>

            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 size-4",
                    ws.isActive ? "text-primary opacity-100" : "opacity-0",
                  )}
                />

                <span className="truncate">{ws.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 size-4" />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        newName={newName}
        setNewName={setNewName}
        isCreating={isCreating}
        onSubmit={handleCreate}
      />
    </>
  );
}

// ──────────────────────────────────────────────
// Create workspace dialog
// ──────────────────────────────────────────────

type CreateWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newName: string;
  setNewName: (name: string) => void;
  isCreating: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

function CreateWorkspaceDialog({
  open,
  onOpenChange,
  newName,
  setNewName,
  isCreating,
  onSubmit,
}: CreateWorkspaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-sm flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>

          <DialogDescription>
            A workspace holds its own clients, projects, and team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-workspace-name">Name</Label>

            <Input
              id="new-workspace-name"
              name="name"
              required
              maxLength={60}
              autoComplete="off"
              placeholder="e.g. Acme Studio"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isCreating || !newName.trim()}>
              {isCreating ? "Creating…" : "Create workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
