"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/actions/client";

type CreateClientFormProps = {
  onCreated: (client: {
    id: string;
    name: string;
    email?: string | null;
  }) => void;
};

export function CreateClientForm({ onCreated }: CreateClientFormProps) {
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
    },

    onSubmit: async ({ value }) => {
      const result = await createClient(value);

      if (!result.success) {
        return;
      }

      onCreated(result.data);
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
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
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
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </div>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
      >
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Creating..." : "Create Client"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
