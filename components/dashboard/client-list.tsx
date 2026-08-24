"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Users,
  Mail,
  Building2,
  MoreHorizontal,
  Trash2,
  Pencil,
  UserPlus,
  Shield,
} from "lucide-react";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import {
  createClient,
  updateClient,
  deleteClient,
} from "@/lib/actions/client";
import { withTimeout } from "@/lib/utils/with-timeout";

const ACTION_TIMEOUT_MS = 15_000;

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type ClientItem = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  _count?: { projects: number };
};

interface ClientListProps {
  clients: ClientItem[];
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function ClientList({ clients }: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<ClientItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const q = searchQuery.toLowerCase();
      return (
        client.name.toLowerCase().includes(q) ||
        client.email.toLowerCase().includes(q) ||
        (client.company && client.company.toLowerCase().includes(q))
      );
    });
  }, [clients, searchQuery]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await withTimeout(
        deleteClient({ id: deleteTarget.id }),
        ACTION_TIMEOUT_MS,
      );

      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't delete client",
          description: result.message,
        });
        return;
      }

      toast.add({
        type: "success",
        title: "Client deleted",
        description: `${deleteTarget.name} has been removed.`,
      });
      setDeleteTarget(null);
    } catch (error) {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (clients.length === 0) {
    return (
      <>
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold">No clients yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your first client to start managing projects and portal access.
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add Client
          </Button>
        </div>

        <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients..."
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Add Client
        </Button>
      </div>

      {/* Client Cards */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate max-w-[70%]">
                  {client.name}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditClient(client)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteTarget(client)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.company && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="truncate">{client.company}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    <span>
                      {client._count?.projects ?? 0} project
                      {(client._count?.projects ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Client
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold">No clients found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search or add a new client.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="mt-4"
          >
            Clear search
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editClient && (
        <EditClientDialog
          client={editClient}
          open={!!editClient}
          onOpenChange={(open) => !open && setEditClient(null)}
        />
      )}

      {deleteTarget && (
        <Dialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete client</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{deleteTarget.name}&quot;?
                This will also remove them from all projects. This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Create Client Dialog
// ──────────────────────────────────────────────

function CreateClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      company: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await withTimeout(
          createClient({
            name: value.name,
            email: value.email,
            company: value.company.trim() || null,
          }),
          ACTION_TIMEOUT_MS,
        );

        if (!result.success) {
          toast.add({
            type: "error",
            title: "Couldn't add client",
            description: result.message,
          });
          return;
        }

        toast.add({
          type: "success",
          title: "Client added",
          description: `"${result.data.name}" has been added.`,
        });
        form.reset();
        onOpenChange(false);
      } catch (error) {
        toast.add({
          type: "error",
          title: "Something went wrong",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Add a new client</DialogTitle>
          <DialogDescription>
            Add a client to your workspace. You can then invite them to specific
            projects.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <form.Field name="name">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={field.state.value}
                  required
                  aria-required
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. John Smith"
                />
                {field.state.meta.errors.length > 0 && (
                  <p role="alert" className="text-xs text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={field.state.value}
                  required
                  aria-required
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="client@example.com"
                />
                {field.state.meta.errors.length > 0 && (
                  <p role="alert" className="text-xs text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="company">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-company">Company (optional)</Label>
                <Input
                  id="create-company"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Client"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Edit Client Dialog
// ──────────────────────────────────────────────

function EditClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: ClientItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm({
    defaultValues: {
      name: client.name,
      email: client.email,
      company: client.company ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await withTimeout(
          updateClient({
            id: client.id,
            name: value.name,
            email: value.email,
            company: value.company.trim() || null,
          }),
          ACTION_TIMEOUT_MS,
        );

        if (!result.success) {
          toast.add({
            type: "error",
            title: "Couldn't update client",
            description: result.message,
          });
          return;
        }

        toast.add({
          type: "success",
          title: "Client updated",
          description: `"${result.data.name}" has been updated.`,
        });
        onOpenChange(false);
      } catch (error) {
        toast.add({
          type: "error",
          title: "Something went wrong",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
          <DialogDescription>
            Update {client.name}&apos;s information.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <form.Field name="name">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={field.state.value}
                  required
                  aria-required
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p role="alert" className="text-xs text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={field.state.value}
                  required
                  aria-required
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p role="alert" className="text-xs text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="company">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-company">Company (optional)</Label>
                <Input
                  id="edit-company"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}


