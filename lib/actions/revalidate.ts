import { revalidatePath } from "next/cache";

/**
 * Standard set of routes affected by workspace/project mutations.
 * Portal pages are dynamic (they read cookies) so they always render
 * fresh data — only dashboard routes need explicit revalidation.
 */
const DASHBOARD_PATHS = [
  "/dashboard",
  "/dashboard/projects",
  "/dashboard/projects/[slug]",
  "/dashboard/clients",
  "/dashboard/portal",
] as const;

export function revalidateDashboard(): void {
  for (const path of DASHBOARD_PATHS) {
    revalidatePath(path, "layout");
  }
}
