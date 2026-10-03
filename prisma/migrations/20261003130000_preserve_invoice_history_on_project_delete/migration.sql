-- Keep invoices and their line-item history when an operator deletes a project.
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_projectId_fkey";
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
