import type { WorkspacePermission } from "@/app/generated/prisma/client";

export const ALL_PERMISSIONS: {
  value: WorkspacePermission;
  label: string;
  description: string;
}[] = [
  {
    value: "MANAGE_WORKSPACE",
    label: "Manage workspace",
    description: "Rename workspace and change settings",
  },
  {
    value: "MANAGE_MEMBERS",
    label: "Manage members",
    description: "Invite, remove, and change member roles",
  },
  {
    value: "MANAGE_CLIENTS",
    label: "Manage clients",
    description: "Create, edit, and delete clients",
  },
  {
    value: "MANAGE_PROJECTS",
    label: "Manage projects",
    description: "Edit project details and settings",
  },
  {
    value: "CREATE_PROJECTS",
    label: "Create projects",
    description: "Create new projects in the workspace",
  },
  {
    value: "VIEW_ALL_PROJECTS",
    label: "View all projects",
    description: "See all projects, not just assigned ones",
  },
  {
    value: "MANAGE_BILLING",
    label: "Manage billing",
    description: "Access billing and subscription settings",
  },
];
