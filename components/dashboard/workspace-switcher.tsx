"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import {
  listWorkspaces,
  switchWorkspace,
} from "@/lib/actions/workspace";
import type { WorkspaceListItem } from "@/lib/actions/workspace";

interface WorkspaceSwitcherProps {
  className?: string;
}

export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    listWorkspaces().then((result) => {
      if (result.success) {
        setWorkspaces(result.data.items);
      }
      setLoading(false);
    });
  }, []);

  const activeWorkspace = workspaces.find((ws) => ws.isActive);

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
        // Reload the page to re-fetch all server components with new workspace context
        window.location.reload();
      } else {
        toast.add({
          type: "error",
          title: "Couldn't switch workspace",
          description: result.message,
        });
      }
    });
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 rounded-md border px-3 py-2", className)}>
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (workspaces.length === 0) return null;

  // Single workspace — show a static label (no dropdown needed)
  if (workspaces.length === 1) {
    return (
      <div className={cn("flex items-center gap-2 rounded-md border px-3 py-2", className)}>
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">
          {activeWorkspace?.name ?? workspaces[0].name}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className={cn("w-full justify-between gap-2 text-left font-normal", className)} disabled={isPending} />}>
        <span className="flex items-center gap-2 overflow-hidden">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm">
            {activeWorkspace?.name ?? "Select workspace"}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onSelect={() => handleSwitch(ws.id)}
            className="cursor-pointer"
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                ws.isActive ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="truncate">{ws.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
