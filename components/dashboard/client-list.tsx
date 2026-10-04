"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Users,
  Mail,
  MoreHorizontal,
  Trash2,
  Pencil,
  UserPlus,
} from "lucide-react";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/dashboard/project/delete-confirm-dialog";
import { EmptyState } from "@/components/presentational/empty-state";
import {
  createClient,
  updateClient,
  deleteClient,
} from "@/lib/actions/client";
import { useServerAction } from "@/hooks/use-server-action";

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

  const remove = useServerAction(deleteClient, {
    success: "Client deleted",
    successDescription: () => `${deleteTarget?.name} has been removed.`,
    failure: "Couldn't delete client",
    refresh: false,
    onSuccess: () => setDeleteTarget(null),
  });

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
    await remove.run({ id: deleteTarget.id });
  };

  if (clients.length === 0) {
    return (
      <>
        <EmptyState
          showIconCircle={false}
          icon={<Users className="mx-auto size-8 text-muted-foreground" />}
          title="No clients yet"
          description="Add your first client to start managing projects and portal access."
        >
          <Button
            size="sm"
            className="mt-4"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add Client
          </Button>
        </EmptyState>

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
        <div className="client-list">
          {filteredClients.map((client) => (
            <div className="client-list-row" key={client.id}>
              <span className="client-avatar" aria-hidden="true">
                {client.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="client-list-main">
                <strong>
                  {client.name}
                </strong>
                <small>{client.company || "Independent client"}</small>
              </span>
              <span className="client-list-email">
                <Mail className="size-3.5" />
                <span>{client.email}</span>
              </span>
              <span className="client-project-count">
                <strong>{client._count?.projects ?? 0}</strong>
                <small>projects</small>
              </span>
              <span className="client-list-actions">
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
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          showIconCircle={false}
          icon={<Users className="mx-auto size-8 text-muted-foreground" />}
          title="No clients found"
          description="Try adjusting your search or add a new client."
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="mt-4"
          >
            Clear search
          </Button>
        </EmptyState>
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

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete client"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will also remove them from all projects. This action cannot be undone.`}
        isDeleting={remove.pending}
      />
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
  const create = useServerAction(createClient, {
    success: "Client added",
    successDescription: (data) => `"${data.name}" has been added.`,
    failure: "Couldn't add client",
    refresh: false,
    onSuccess: () => {
      form.reset();
      onOpenChange(false);
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      company: "",
    },
    onSubmit: async ({ value }) => {
      await create.run({
        name: value.name,
        email: value.email,
        company: value.company.trim() || null,
      });
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
  const update = useServerAction(updateClient, {
    success: "Client updated",
    successDescription: (data) => `"${data.name}" has been updated.`,
    failure: "Couldn't update client",
    refresh: false,
    onSuccess: () => onOpenChange(false),
  });

  const form = useForm({
    defaultValues: {
      name: client.name,
      email: client.email,
      company: client.company ?? "",
    },
    onSubmit: async ({ value }) => {
      await update.run({
        id: client.id,
        name: value.name,
        email: value.email,
        company: value.company.trim() || null,
      });
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


