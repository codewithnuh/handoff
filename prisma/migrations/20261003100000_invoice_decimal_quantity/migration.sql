-- Preserve existing whole quantities while allowing fractional billable units.
ALTER TABLE "invoice_line_items"
  ALTER COLUMN "quantity" TYPE DECIMAL(9, 3)
  USING "quantity"::DECIMAL(9, 3);

-- A deliverable may be converted only once per invoice, including concurrent retries.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "invoice_line_items"
    WHERE "deliverableId" IS NOT NULL
    GROUP BY "invoiceId", "deliverableId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate invoice deliverable links exist; reconcile them before applying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX "invoice_line_items_invoiceId_deliverableId_key"
  ON "invoice_line_items"("invoiceId", "deliverableId");
