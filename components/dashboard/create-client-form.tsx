"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/actions/client";
import { useServerAction } from "@/hooks/use-server-action";
import { ActionTimeoutError } from "@/lib/utils/with-timeout";

type CreateClientFormProps = {
  onCreated: (client: {
    id: string;
    name: string;
    email?: string | null;
  }) => void;
};

export function CreateClientForm({ onCreated }: CreateClientFormProps) {
  const create = useServerAction(createClient, {
    success: "Client created",
    successDescription: (data) => `${data.name} was added to your workspace.`,
    failure: "Couldn't create client",
    thrown: (error) =>
      error instanceof ActionTimeoutError
        ? "Request timed out"
        : "Something went wrong",
    refresh: false,
    onSuccess: (data) => onCreated(data),
    onError: (error) => {
      form.setFieldMeta("name", (meta) => ({
        ...meta,
        errorMap: {
          onSubmit:
            error.fieldErrors?.name?.join(", ") ?? meta.errorMap.onSubmit,
        },
      }));
      form.setFieldMeta("email", (meta) => ({
        ...meta,
        errorMap: {
          onSubmit:
            error.fieldErrors?.email?.join(", ") ?? meta.errorMap.onSubmit,
        },
      }));
      form.setFieldMeta("company", (meta) => ({
        ...meta,
        errorMap: {
          onSubmit:
            error.fieldErrors?.company?.join(", ") ?? meta.errorMap.onSubmit,
        },
      }));
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      company: "",
    },

    onSubmit: async ({ value }) => {
      await create.run(value);
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4 relative w-full"
    >
      <form.Field name="name">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Client name</Label>

            <Input
              id={field.name}
              value={field.state.value}
              placeholder="Acme Corporation"
              required
              aria-required
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
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
            <Label htmlFor={field.name}>Email</Label>

            <Input
              id={field.name}
              type="email"
              value={field.state.value}
              placeholder="client@example.com"
              required
              aria-required
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
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
            <Label htmlFor={field.name}>Company</Label>

            <Input
              id={field.name}
              value={field.state.value}
              placeholder="Company (optional)"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p role="alert" className="text-xs text-destructive">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
      >
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Client"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}