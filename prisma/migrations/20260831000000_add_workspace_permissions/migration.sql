-- CreateEnum
CREATE TYPE "WorkspacePermission" AS ENUM ('MANAGE_WORKSPACE', 'MANAGE_MEMBERS', 'MANAGE_CLIENTS', 'MANAGE_PROJECTS', 'CREATE_PROJECTS', 'VIEW_ALL_PROJECTS', 'MANAGE_BILLING');

-- AlterTable: Add permissions array to workspace_members
ALTER TABLE "workspace_members" ADD COLUMN "permissions" "WorkspacePermission"[] DEFAULT '{}';

-- AlterTable: Add role and permissions to team_invitations
ALTER TABLE "team_invitations" ADD COLUMN "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "team_invitations" ADD COLUMN "permissions" JSONB;
