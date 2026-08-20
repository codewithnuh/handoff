"use client";
import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { createProject } from "@/lib/actions/project";
import { ClientCombobox } from "./create-client";
const fakeClients = [
  {
    id: "cl_fake_acme_01",
    workspaceId: "ws_fake_sarah_01",
    name: "John Carter",
    email: "john.carter@acme.com",
    company: "Acme Corporation",
    createdAt: new Date("2026-08-15T10:00:00.000Z"),
    updatedAt: new Date("2026-08-15T10:00:00.000Z"),
  },
  {
    id: "cl_fake_globex_02",
    workspaceId: "ws_fake_sarah_01",
    name: "Sarah Miller",
    email: "sarah@globex.com",
    company: "Globex",
    createdAt: new Date("2026-08-16T12:30:00.000Z"),
    updatedAt: new Date("2026-08-16T12:30:00.000Z"),
  },
  {
    id: "cl_fake_stark_03",
    workspaceId: "ws_fake_sarah_01",
    name: "Tony Stark",
    email: "tony@starkindustries.com",
    company: "Stark Industries",
    createdAt: new Date("2026-08-17T09:15:00.000Z"),
    updatedAt: new Date("2026-08-17T09:15:00.000Z"),
  },
];
type DashboardHeaderProps = {
  userName: string;
  workspaceName: string;
};

export function DashboardHeader({
  userName,
  workspaceName,
}: DashboardHeaderProps) {
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      projectName: "",
      projectDescription: "",
      startDate: "",
      endDate: "",
    },
    onSubmit: async ({ value }) => {
      console.log({ value });
      // await createProject(value);
      form.reset();
      setOpen(false);
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
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove your data from our servers.
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
          <DialogContent className="flex flex-col gap-4">
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
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      required
                      aria-required
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Project Name"
                    />
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
                      clients={fakeClients}
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  </div>
                )}
              </form.Field>
              {/* Start Date Field */}
              <form.Field name="startDate">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Start Date</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="date"
                      required
                      aria-required
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

              {/* Submit Button */}
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit} className="mt-2">
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
