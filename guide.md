# Server Actions Best Practices — Next.js 16

This guide covers how to write, structure, and maintain server actions in a Next.js 16 App Router project. It's based on the patterns used in this codebase and the official Next.js conventions.

---

## Table of Contents

1. [What Are Server Actions?](#what-are-server-actions)
2. [File Organization](#file-organization)
3. [Writing a Server Action](#writing-a-server-action)
4. [Input Validation with Zod](#input-validation-with-zod)
5. [Auth Guards](#auth-guards)
6. [Error Handling](#error-handling)
7. [Revalidation After Mutations](#revalidation-after-mutations)
8. [Calling Server Actions from Client Components](#calling-server-actions-from-client-components)
9. [Activity Logging / Side Effects](#activity-logging--side-effects)
10. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## 1. What Are Server Actions?

Server Actions are async functions marked with `"use server"` that run **exclusively on the server**. They let you call backend logic directly from client components without creating API routes.

```ts
"use server";

export async function greetUser(name: string) {
  return `Hello, ${name}!`;
}
```

Client components can import and call them like regular async functions:

```tsx
"use client";
import { greetUser } from "@/lib/actions/user";

export function Greeting() {
  const handleClick = async () => {
    const message = await greetUser("Alice");
    console.log(message);
  };
  return <button onClick={handleClick}>Greet</button>;
}
```

---

## 2. File Organization

This project separates concerns into three layers:

| Layer | Location | Purpose |
|-------|----------|---------|
| **Server Actions** | `lib/actions/*.ts` | Mutation logic (create, update, delete). Handles validation, auth, DB writes, revalidation. |
| **Queries** | `lib/queries/*.ts` | Read-only data fetching for Server Components. No validation/revalidation overhead. |
| **Validation** | `lib/validation/*.ts` | Zod schemas shared between client forms and server actions. |

**Rules of thumb:**
- Each domain entity gets its own file: `project.ts`, `deliverable.ts`, `invoice.ts`, etc.
- Server action files start with `"use server"` at the top.
- Query files do **not** use `"use server"` — they're regular async functions called directly in Server Components.
- Keep validation schemas separate so both client and server can import them.

---

## 3. Writing a Server Action

Here's the anatomy of a well-structured server action:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/actions/guards";
import { toActionError } from "@/lib/actions/helpers";
import { ERROR_CODES } from "@/lib/constants/errors";
import { ActionResponse } from "@/lib/utils/action-response";
import { createProjectSchema } from "@/lib/validation/project";
import type { CreateProjectInput } from "@/lib/validation/project";
import type { ActionResponseType } from "@/lib/types/action";

export const createProject = async (
  data: CreateProjectInput,
): Promise<ActionResponseType<ProjectResult>> => {
  // 1. Validate input
  const validated = createProjectSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  // 2. Auth guard
  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  // 3. Business logic + DB write
  try {
    const project = await db.project.create({
      data: {
        workspaceId: guard.value.workspace.id,
        name: validated.data.name,
        // ...
      },
    });

    // 4. Side effects (activity log, notifications, etc.)
    await recordActivity({ projectId: project.id, type: "PROJECT_CREATED", ... });

    // 5. Revalidate affected pages
    revalidatePath("/dashboard");

    // 6. Return success
    return ActionResponse.success(project, "Project created successfully");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to create the project." });
  }
};
```

### Key principles:
1. **Always validate first** — before hitting the database.
2. **Always guard with auth** — every action must verify the user has permission.
3. **Try/catch everything** — never let raw errors escape to the client.
4. **Revalidate after mutations** — so the UI reflects the new state.
5. **Return a standardized response** — use `ActionResponse.success()` / `ActionResponse.failure()`.

---

## 4. Input Validation with Zod

Define schemas in `lib/validation/` and import them in both server actions and client forms.

```ts
// lib/validation/project.ts
import { z } from "zod";
import { idSchema, nameSchema, optionalNullableString } from "@/lib/validation/shared";

export const createProjectSchema = z.object({
  clientId: idSchema,
  name: nameSchema,
  description: optionalNullableString(5000, "Description"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
```

### Shared validators (`lib/validation/shared.ts`):

```ts
export const idSchema = z.string().trim().min(1).max(64);
export const nameSchema = z.string().trim().min(1).max(120);
export const titleSchema = z.string().trim().min(1).max(200);
export const optionalNullableString = (max: number, field: string) =>
  z.string().trim().max(max).nullable().optional();
```

### Why this pattern?
- **Single source of truth** — same schema validates client forms and server inputs.
- **Type safety** — `z.infer<typeof schema>` gives you TypeScript types automatically.
- **Consistent error messages** — Zod generates field-level errors that map to UI.

---

## 5. Auth Guards

Every server action must start with an auth check. Use the guard pattern from `lib/actions/guards.ts`:

```ts
import { requireWorkspace } from "@/lib/actions/guards";

export const someAction = async (data: InputType) => {
  // This throws a standardized UNAUTHORIZED error if not logged in
  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  // guard.value contains { user, workspace }
  const { user, workspace } = guard.value;
  // ...
};
```

### Available guards:

| Guard | Returns | Use when |
|-------|---------|----------|
| `requireAuth()` | `{ user }` | Any authenticated action |
| `requireWorkspace()` | `{ user, workspace }` | Most actions (need workspace context) |
| `requireProjectInWorkspace(workspaceId, projectId)` | `{ projectId }` | Project-scoped actions |
| `requireClientInWorkspace(workspaceId, clientId)` | `{ clientId }` | Client-scoped actions |

### Why the `Guarded<T>` pattern?

```ts
type Guarded<T> =
  | { ok: true; value: T }
  | { ok: false; error: ActionError };
```

This discriminated union lets you short-circuit with `if (!guard.ok) return guard.error` — clean, type-safe, no exceptions.

---

## 6. Error Handling

### The `toActionError` helper

Maps any thrown error to a standardized response:

```ts
import { toActionError } from "@/lib/actions/helpers";

try {
  // ... DB operations
} catch (error) {
  return toActionError(error, {
    fallback: "Failed to create the project.",
    conflict: "A project with this name already exists.",
  });
}
```

### What it handles automatically:
- **Prisma P2002** (unique constraint) → `CONFLICT` error
- **Prisma P2025** (record not found) → `NOT_FOUND` error
- **Prisma P2003/P2014** (foreign key) → `CONFLICT` error
- **Everything else** → `INTERNAL_ERROR` with your fallback message

### Standardized response shape:

```ts
// Success
{ success: true, message: "Project created", data: { ... } }

// Failure
{ success: false, message: "Invalid input", error: {
  code: "VALIDATION_ERROR",
  fieldErrors: { name: ["Name is required"] }
}}
```

---

## 7. Revalidation After Mutations

After any database mutation, you must revalidate the affected pages so the UI updates:

```ts
import { revalidatePath } from "next/cache";

// Revalidate a specific page
revalidatePath("/dashboard");

// Revalidate a layout (affects all routes under it)
revalidatePath("/dashboard/projects/[slug]", "layout");
```

### Best practices:

```ts
// ✅ DO — Revalidate all affected routes
const revalidateDashboard = () => {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/projects/[slug]", "layout");
};

// ❌ DON'T — Call revalidatePath on routes you don't need
// ❌ DON'T forget to revalidate after mutations
// ❌ DON'T revalidate inside a try/catch that might swallow errors
```

### Common revalidation patterns:

| Action | Revalidate |
|--------|-----------|
| Create/update/delete project | `/dashboard`, `/dashboard/projects`, `/dashboard/projects/[slug]` |
| Create/update/delete deliverable | Same as project (deliverables appear on project detail) |
| Create/update/delete invoice | Same as project |
| Update project status | Same as project |

---

## 8. Calling Server Actions from Client Components

### Pattern 1: Direct call with toast feedback

```tsx
"use client";
import { createDeliverable } from "@/lib/actions/deliverable";
import { toast } from "@/components/ui/toast";

export function CreateButton({ projectId }: { projectId: string }) {
  const handleClick = async () => {
    const result = await createDeliverable({
      projectId,
      title: "New Deliverable",
    });

    if (!result.success) {
      toast.add({ type: "error", title: "Failed", description: result.message });
      return;
    }

    toast.add({ type: "success", title: "Created!", description: result.message });
  };

  return <button onClick={handleClick}>Create</button>;
}
```

### Pattern 2: Using `@tanstack/react-form` (used in this project)

```tsx
"use client";
import { useForm } from "@tanstack/react-form";

const form = useForm({
  defaultValues: { title: "", description: "" },
  onSubmit: async ({ value }) => {
    const result = await createDeliverable({ projectId, ...value });
    if (!result.success) {
      toast.add({ type: "error", title: "Failed", description: result.message });
      return;
    }
    toast.add({ type: "success", title: "Created!" });
    form.reset();
    setOpen(false);
  },
});

return (
  <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
    <form.Field name="title">
      {(field) => (
        <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
      )}
    </form.Field>
    <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      )}
    </form.Subscribe>
  </form>
);
```

### Key rules:
- Always check `result.success` before showing success toast.
- Always disable submit buttons while `isSubmitting` is true.
- Always show error messages from `result.message` or `result.error.fieldErrors`.

---

## 9. Activity Logging / Side Effects

Activity logging happens **after** the primary mutation succeeds but **before** revalidation:

```ts
const project = await db.project.create({ data: { ... } });

// Log activity (fire-and-forget — failures are caught internally)
await recordActivity({
  projectId: project.id,
  type: "PROJECT_CREATED",
  actorUserId: guard.value.user.id,
  actorEmail: guard.value.user.email,
  actorName: guard.value.user.name,
  meta: { name: project.name },
});

revalidatePath("/dashboard");
return ActionResponse.success(project, "Project created");
```

### Why this order?
1. **DB write first** — the user's action must succeed.
2. **Activity log second** — best-effort, logged but doesn't break the flow.
3. **Revalidate last** — ensures the UI shows the fresh data.

The `recordActivity` helper silently catches errors so a failed log never breaks the user's action:

```ts
export const recordActivity = async (input: RecordActivityInput) => {
  try {
    await db.activity.create({ data: input });
  } catch (error) {
    console.error("Failed to record activity:", error);
  }
};
```

---

## 10. Common Mistakes to Avoid

### ❌ Don't expose raw database errors to the client
```ts
// BAD
catch (error) {
  return { error: error.message }; // leaks internal details
}

// GOOD
catch (error) {
  return toActionError(error, { fallback: "Something went wrong." });
}
```

### ❌ Don't forget `"use server"` at the top of action files
```ts
// BAD — this function runs on the client and tries to import DB
import { db } from "@/lib/prisma";
export const createUser = async () => { ... };

// GOOD
"use server";
import { db } from "@/lib/prisma";
export const createUser = async () => { ... };
```

### ❌ Don't skip auth guards
```ts
// BAD — any visitor can delete projects
export const deleteProject = async (data: { id: string }) => {
  await db.project.delete({ where: { id: data.id } });
};

// GOOD
export const deleteProject = async (data: { id: string }) => {
  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;
  // ... validate + delete with workspace check
};
```

### ❌ Don't forget to revalidate after mutations
```ts
// BAD — UI shows stale data
const project = await db.project.create({ data });
return ActionResponse.success(project, "Created");

// GOOD
const project = await db.project.create({ data });
revalidatePath("/dashboard");
return ActionResponse.success(project, "Created");
```

### ❌ Don't use `revalidateAll()` calling itself recursively
```ts
// BAD — infinite recursion
const revalidateAll = () => {
  revalidateAll(); // calls itself!
};

// GOOD
const revalidateAll = () => {
  for (const p of projectPaths) revalidatePath(p, "layout");
};
```

### ❌ Don't pass client names as filter values when you need IDs
```tsx
// BAD — value is the name, but filter compares against ID
<SelectItem value={client.name}>{client.name}</SelectItem>
// later: project.client.id === selectedClientId // never matches!

// GOOD — use the ID as the value
<SelectItem value={client.id}>{client.name}</SelectItem>
```

---

## Quick Reference

### Server Action Template

```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/actions/guards";
import { toActionError } from "@/lib/actions/helpers";
import { ERROR_CODES } from "@/lib/constants/errors";
import { ActionResponse } from "@/lib/utils/action-response";
import { createThingSchema } from "@/lib/validation/thing";
import type { CreateThingInput } from "@/lib/validation/thing";
import type { ActionResponseType } from "@/lib/types/action";

type ThingResult = /* your Prisma type */;

export const createThing = async (
  data: CreateThingInput,
): Promise<ActionResponseType<ThingResult>> => {
  // 1. Validate
  const validated = createThingSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  // 2. Auth
  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  // 3. Mutate
  try {
    const thing = await db.thing.create({
      data: { workspaceId: guard.value.workspace.id, ...validated.data },
    });

    // 4. Side effects
    await recordActivity({ /* ... */ });

    // 5. Revalidate
    revalidatePath("/dashboard");

    // 6. Return
    return ActionResponse.success(thing, "Thing created successfully");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to create the thing." });
  }
};
```

### Validation Schema Template

```ts
// lib/validation/thing.ts
import { z } from "zod";
import { idSchema, nameSchema, optionalNullableString } from "@/lib/validation/shared";

export const createThingSchema = z.object({
  name: nameSchema,
  description: optionalNullableString(5000, "Description"),
});

export type CreateThingInput = z.infer<typeof createThingSchema>;

export const thingIdSchema = z.object({ id: idSchema });
export type ThingIdInput = z.infer<typeof thingIdSchema>;
```

### Client Component Calling Pattern

```tsx
"use client";
import { createThing } from "@/lib/actions/thing";
import { toast } from "@/components/ui/toast";

async function handleCreate() {
  const result = await createThing({ name: "New Thing" });
  if (!result.success) {
    toast.add({ type: "error", title: "Failed", description: result.message });
    return;
  }
  toast.add({ type: "success", title: "Created!", description: result.message });
}
```
