-- DropIndex
DROP INDEX "workspaces_ownerId_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeWorkspaceId" TEXT;

-- CreateIndex
CREATE INDEX "workspaces_ownerId_idx" ON "workspaces"("ownerId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeWorkspaceId_fkey" FOREIGN KEY ("activeWorkspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
