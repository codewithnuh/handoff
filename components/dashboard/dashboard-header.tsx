"use client";

import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { IconPlus } from "@tabler/icons-react";
import { User } from "lucide-react";

import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createProject } from "@/lib/actions/project";
import { createClient } from "@/lib/actions/client";
import { useServerAction } from "@/hooks/use-server-action";
import { ActionTimeoutError } from "@/lib/utils/with-timeout";
import { cn } from "@/lib/utils";
import { ClientCombobox, type ClientOption } from "./create-client";

type DashboardHeaderProps = {
  userName: string;
  workspaceName: string;
  clients: ClientOption[];
  canCreateProject?: boolean;
  canManageClients?: boolean;
};

export function DashboardHeader({
  userName,
  workspaceName,
  clients,
  canCreateProject = true,
  canManageClients = true,
}: DashboardHeaderProps) {
  const [projectOpen, setProjectOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientCreationOpen, setClientCreationOpen] = useState(false);
  const projectNameRef = useRef<HTMLInputElement | null>(null);
  const clientNameRef = useRef<HTMLInputElement | null>(null);

  // ── Create Project Form ──
  const createProjectAction = useServerAction(createProject, {
    success: "Project created",
    successDescription: (data) => `"${data.name}" is ready to go.`,
    failure: "Couldn't create project",
    thrown: (error) =>
      error instanceof ActionTimeoutError
        ? "Request timed out"
        : "Something went wrong",
    refresh: false,
    onSuccess: () => {
      projectForm.reset();
      setProjectOpen(false);
      setClientCreationOpen(false);
    },
    onError: (error) => {
      projectForm.setFieldMeta("projectName", (meta) => ({
        ...meta,
        errorMap: {
          onSubmit:
            error.fieldErrors?.name?.join(", ") ?? meta.errorMap.onSubmit,
        },
      }));
      projectForm.setFieldMeta("projectDescription", (meta) => ({
        ...meta,
        errorMap: {
          onSubmit:
            error.fieldErrors?.description?.join(", ") ?? meta.errorMap.onSubmit,
        },
      }));
      projectForm.setFieldMeta("clientId", (meta) => ({
        ...meta,
        errorMap: {
          onSubmit:
            error.fieldErrors?.clientId?.join(", ") ?? meta.errorMap.onSubmit,
        },
      }));
      projectForm.setFieldMeta("startDate", (meta) => ({
        ...meta,
        errorMap: {
          onSubmit:
            error.fieldErrors?.startDate?.join(", ") ?? meta.errorMap.onSubmit,
        },
      }));
      projectForm.setFieldMeta("endDate", (meta) => ({
        ...meta,
        errorMap: {
          onSubmit:
            error.fieldErrors?.dueDate?.join(", ") ?? meta.errorMap.onSubmit,
        },
      }));
    },
  });

  const projectForm = useForm({
    defaultValues: {
      projectName: "",
      projectDescription: "",
      clientId: "",
      startDate: "",
      endDate: "",
    },
    onSubmit: async ({ value }) => {
      await createProjectAction.run({
        name: value.projectName,
        description: value.projectDescription.trim() || null,
        clientId: value.clientId,
        startDate: value.startDate ? new Date(value.startDate) : null,
        dueDate: value.endDate ? new Date(value.endDate) : null,
      });
    },
  });

  // ── Create Client Form ──
  const createClientAction = useServerAction(createClient, {
    success: "Client created",
    successDescription: (data) =>
      `"${data.name}" has been added to your workspace.`,
    failure: "Couldn't create client",
    thrown: (error) =>
      error instanceof ActionTimeoutError
        ? "Request timed out"
        : "Something went wrong",
    refresh: false,
    onSuccess: () => {
      clientForm.reset();
      setClientOpen(false);
    },
  });

  const clientForm = useForm({
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientCompany: "",
    },
    onSubmit: async ({ value }) => {
      await createClientAction.run({
        name: value.clientName,
        email: value.clientEmail,
        company: value.clientCompany.trim() || null,
      });
    },
  });

  return (
    <div className="workspace-heading">
      <div>
        <p className="mb-1 text-sm">Good to see you, {userName}</p>
        <h1>
          {workspaceName}
        </h1>
        <p className="mt-2">
          Your client work, projects, and payments in one view.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canManageClients && (
          <Dialog open={clientOpen} onOpenChange={setClientOpen}>
            <DialogTrigger render={<Button size="lg" variant="secondary" />}>
              <User className="mr-2 h-4 w-4" />
              Add Client
            </DialogTrigger>
            <DialogContent
              initialFocus={clientNameRef}
              className="flex flex-col gap-4"
            >
              <DialogHeader>
                <DialogTitle>Add a new client</DialogTitle>
                <DialogDescription>
                  Add a client to your workspace. You can then invite them to
                  specific projects from the project page.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clientForm.handleSubmit();
                }}
                className="flex flex-col gap-4 mt-2"
              >
                <clientForm.Field name="clientName">
                  {(field) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={field.name}>Client Name</Label>
                      <Input
                        ref={(node) => {
                          clientNameRef.current = node;
                        }}
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        required
                        aria-required
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Acme Corp"
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p role="alert" className="text-xs text-destructive">
                          {field.state.meta.errors.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </clientForm.Field>

                <clientForm.Field name="clientEmail">
                  {(field) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={field.name}>Email</Label>
                      <Input
                        id={field.name}
                        name={field.name}
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
                </clientForm.Field>

                <clientForm.Field name="clientCompany">
                  {(field) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={field.name}>Company (optional)</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Acme Inc."
                      />
                    </div>
                  )}
                </clientForm.Field>

                <clientForm.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      className="mt-2"
                    >
                      {isSubmitting ? "Adding..." : "Add Client"}
                    </Button>
                  )}
                </clientForm.Subscribe>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Create Project Modal */}
        {canCreateProject && (
          <Dialog
            disablePointerDismissal
            open={projectOpen}
            onOpenChange={setProjectOpen}
          >
            <DialogTrigger
              render={
                <Button
                  size="sm"
                  className="h-8 gap-1 px-2.5 text-xs/relaxed"
                />
              }
            >
              <IconPlus className="mr-2 h-4 w-4" />
              <span>Create Project</span>
            </DialogTrigger>

            <DialogContent
              initialFocus={projectNameRef}
              className={cn(
                "flex flex-col gap-4 transition duration-100",
                clientCreationOpen && "opacity-0 blur-sm",
              )}
            >
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Create a new project to get started.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  projectForm.handleSubmit();
                }}
                className="flex flex-col gap-4 mt-2"
              >
                {/* Project Name Field */}
                <projectForm.Field name="projectName">
                  {(field) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={field.name}>Project Name</Label>
                      <Input
                        ref={(node) => {
                          projectNameRef.current = node;
                        }}
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        required
                        aria-required
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Project Name"
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p role="alert" className="text-xs text-destructive">
                          {field.state.meta.errors.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </projectForm.Field>

                {/* Project Description Field */}
                <projectForm.Field name="projectDescription">
                  {(field) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={field.name}>Project Description</Label>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        maxLength={300}
                        placeholder="Project Description"
                      />
                    </div>
                  )}
                </projectForm.Field>

                <projectForm.Field name="clientId">
                  {(field) => (
                    <div className="flex flex-col gap-1.5">
                      <Label>Client</Label>

                      <ClientCombobox
                        clients={clients}
                        value={field.state.value}
                        onChange={field.handleChange}
                        isOpen={clientCreationOpen}
                        onOpenChange={setClientCreationOpen}
                      />

                      {field.state.meta.errors.length > 0 && (
                        <p role="alert" className="text-xs text-destructive">
                          {field.state.meta.errors.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </projectForm.Field>

                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date Field */}
                  <projectForm.Field name="startDate">
                    {(field) => (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={field.name}>Start Date</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="date"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </projectForm.Field>

                  {/* End Date Field */}
                  <projectForm.Field name="endDate">
                    {(field) => (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={field.name}>Due Date</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="date"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </projectForm.Field>
                </div>

                {/* Submit Button */}
                <projectForm.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      className="mt-2"
                    >
                      {isSubmitting ? "Creating..." : "Create Project"}
                    </Button>
                  )}
                </projectForm.Subscribe>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
