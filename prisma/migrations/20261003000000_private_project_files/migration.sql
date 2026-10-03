ALTER TABLE "files"
  ADD COLUMN "projectId" TEXT,
  ADD COLUMN "uploadedByUserId" TEXT,
  ADD COLUMN "uploadIntentId" TEXT,
  ADD COLUMN "attachedAt" TIMESTAMP(3);

-- Backfill ownership only when every reference belongs to the same project.
-- Ambiguous legacy files stay unowned and are denied by the download route.
WITH file_projects AS (
  SELECT dv."fileId", MIN(d."projectId") AS "projectId"
  FROM "deliverable_versions" dv
  JOIN "deliverables" d ON d."id" = dv."deliverableId"
  WHERE dv."fileId" IS NOT NULL
  GROUP BY dv."fileId"
  HAVING COUNT(DISTINCT d."projectId") = 1
)
UPDATE "files" f
SET "projectId" = fp."projectId",
    "attachedAt" = f."createdAt"
FROM file_projects fp
WHERE f."id" = fp."fileId";

CREATE TABLE "file_upload_intents" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "providerKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "file_upload_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "files_uploadIntentId_key" ON "files"("uploadIntentId");
CREATE UNIQUE INDEX "file_upload_intents_providerKey_key" ON "file_upload_intents"("providerKey");
CREATE INDEX "files_projectId_createdAt_idx" ON "files"("projectId", "createdAt");
CREATE INDEX "files_uploadedByUserId_idx" ON "files"("uploadedByUserId");
CREATE INDEX "file_upload_intents_status_expiresAt_idx" ON "file_upload_intents"("status", "expiresAt");
CREATE INDEX "file_upload_intents_projectId_userId_idx" ON "file_upload_intents"("projectId", "userId");

ALTER TABLE "files" ADD CONSTRAINT "files_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_uploadedByUserId_fkey"
  FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_uploadIntentId_fkey"
  FOREIGN KEY ("uploadIntentId") REFERENCES "file_upload_intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "file_upload_intents" ADD CONSTRAINT "file_upload_intents_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_upload_intents" ADD CONSTRAINT "file_upload_intents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
