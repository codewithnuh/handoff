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
  "/dashboard/team",
  "/dashboard/settings",
  "/dashboard/portal",
] as const;

export function revalidateDashboard(): void {
  try {
    for (const path of DASHBOARD_PATHS) {
      revalidatePath(path, "layout");
    }
  } catch (error) {
    console.error("Failed to revalidate dashboard:", error);
  }
}
