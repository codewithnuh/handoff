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
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createProject } from "@/lib/actions/project";
import {
  ActionTimeoutError,
  withTimeout,
} from "@/lib/utils/with-timeout";
import { ClientCombobox, type ClientOption } from "./create-client";

const ACTION_TIMEOUT_MS = 15_000;

type DashboardHeaderProps = {
  userName: string;
  workspaceName: string;
  clients: ClientOption[];
};

export function DashboardHeader({
  userName,
  workspaceName,
  clients,
}: DashboardHeaderProps) {
  const [open, setOpen] = useState(false);
  const projectNameRef = useRef<HTMLInputElement | null>(null);

  const form = useForm({
    defaultValues: {
      projectName: "",
      projectDescription: "",
      clientId: "",
      startDate: "",
      endDate: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await withTimeout(
          createProject({
            name: value.projectName,
            description: value.projectDescription.trim() || null,
            clientId: value.clientId,
            startDate: value.startDate ? new Date(value.startDate) : null,
            dueDate: value.endDate ? new Date(value.endDate) : null,
          }),
          ACTION_TIMEOUT_MS,
        );

        if (!result.success) {
          form.setFieldMeta("projectName", (meta) => ({
            ...meta,
            errorMap: {
              onSubmit:
                result.error.fieldErrors?.name?.join(", ") ??
                meta.errorMap.onSubmit,
            },
          }));
          form.setFieldMeta("projectDescription", (meta) => ({
            ...meta,
            errorMap: {
              onSubmit:
                result.error.fieldErrors?.description?.join(", ") ??
                meta.errorMap.onSubmit,
            },
          }));
          form.setFieldMeta("clientId", (meta) => ({
            ...meta,
            errorMap: {
              onSubmit:
                result.error.fieldErrors?.clientId?.join(", ") ??
                meta.errorMap.onSubmit,
            },
          }));
          form.setFieldMeta("startDate", (meta) => ({
            ...meta,
            errorMap: {
              onSubmit:
                result.error.fieldErrors?.startDate?.join(", ") ??
                meta.errorMap.onSubmit,
            },
          }));
          form.setFieldMeta("endDate", (meta) => ({
            ...meta,
            errorMap: {
              onSubmit:
                result.error.fieldErrors?.dueDate?.join(", ") ??
                meta.errorMap.onSubmit,
            },
          }));

          toast.add({
            type: "error",
            title: "Couldn't create project",
            description: result.message,
          });
          return;
        }

        toast.add({
          type: "success",
          title: "Project created",
          description: `"${result.data.name}" is ready to go.`,
        });

        form.reset();
        setOpen(false);
      } catch (error) {
        if (error instanceof ActionTimeoutError) {
          toast.add({
            type: "error",
            title: "Request timed out",
            description: error.message,
          });
          return;
        }

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
    <div className="flex border-b-2 pb-5 gap-5 sm:items-end justify-between flex-col sm:flex-row">
      <div>
        <p className="text-muted-foreground">Good morning, {userName}</p>
        <h2 className="text-secondary-foreground font-bold text-2xl">
          {workspaceName}
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening across your projects today.
        </p>
      </div>

      <div className="flex items-center gap-x-4">
        {/* Client Invite Modal */}
        <Dialog>
          <DialogTrigger>
            <Button size={"lg"} variant={"secondary"}>
              <User className="mr-2 h-4 w-4" />
              Invite Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a client</DialogTitle>
              <DialogDescription>
                Invite a client to your portal so they can follow their
                projects and deliverables.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Create Project Modal */}
        <Dialog disablePointerDismissal open={open} onOpenChange={setOpen}>
          <DialogTrigger
            className={cn(
              "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs/relaxed font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 hover:cursor-pointer focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 bg-primary text-primary-foreground hover:bg-primary/80 hover",
              "h-8 gap-1 px-2.5 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
            )}
          >
            <IconPlus className="mr-2 h-4 w-4" />
            <span>Create Project</span>
          </DialogTrigger>
          <DialogContent
            initialFocus={projectNameRef}
            className="flex flex-col gap-4"
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
                form.handleSubmit();
              }}
              className="flex flex-col gap-4 mt-2"
            >
              {/* Project Name Field */}
              <form.Field name="projectName">
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
                      <p
                        role="alert"
                        className="text-xs text-destructive"
                      >
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Project Description Field */}
              <form.Field name="projectDescription">
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
              </form.Field>

              <form.Field name="clientId">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label>Client</Label>

                    <ClientCombobox
                      clients={clients}
                      value={field.state.value}
                      onChange={field.handleChange}
                    />

                    {field.state.meta.errors.length > 0 && (
                      <p
                        role="alert"
                        className="text-xs text-destructive"
                      >
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <div className="grid grid-cols-2 gap-4">
                {/* Start Date Field */}
                <form.Field name="startDate">
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
                </form.Field>

                {/* End Date Field */}
                <form.Field name="endDate">
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
                </form.Field>
              </div>

              {/* Submit Button */}
              <form.Subscribe
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
              </form.Subscribe>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}