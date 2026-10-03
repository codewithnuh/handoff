-- Reconcile the persisted beta schema with the current Prisma model.
-- Existing invoice totals remain intact; the legacy Stripe records are archived
-- before current Paddle subscriptions are initialized from their remaining term.

ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAUSED';

ALTER TABLE "invoices"
  ADD COLUMN "clientAddress" JSONB,
  ADD COLUMN "clientEmail" TEXT,
  ADD COLUMN "clientName" TEXT,
  ADD COLUMN "clientTaxId" TEXT,
  ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "paymentNotes" TEXT,
  ADD COLUMN "senderAddress" JSONB,
  ADD COLUMN "senderEmail" TEXT,
  ADD COLUMN "senderName" TEXT,
  ADD COLUMN "senderTaxId" TEXT,
  ADD COLUMN "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ALTER COLUMN "amount" SET DEFAULT 0;

-- Preserve the historic Stripe identifiers and workspace associations before
-- moving entitlements to the current user-owned Paddle subscription model.
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_workspaceId_fkey";
ALTER TABLE "subscriptions" RENAME TO "legacy_stripe_subscriptions";
ALTER TABLE "legacy_stripe_subscriptions" RENAME CONSTRAINT "subscriptions_pkey" TO "legacy_stripe_subscriptions_pkey";
ALTER INDEX "subscriptions_workspaceId_key" RENAME TO "legacy_stripe_subscriptions_workspaceId_key";
ALTER INDEX "subscriptions_stripeCustomerId_key" RENAME TO "legacy_stripe_subscriptions_stripeCustomerId_key";
ALTER INDEX "subscriptions_stripeSubscriptionId_key" RENAME TO "legacy_stripe_subscriptions_stripeSubscriptionId_key";

CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "paddleCustomerId" TEXT,
  "paddleSubscriptionId" TEXT,
  "paddlePriceId" TEXT,
  "nextBilledAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "gracePeriodEndsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- One current subscription can exist per account. When an old account owned
-- multiple workspaces, all original rows remain in the archive and its longest
-- remaining paid term determines the migrated account-level entitlement.
INSERT INTO "subscriptions" (
  "id", "userId", "plan", "status", "nextBilledAt", "canceledAt",
  "gracePeriodEndsAt", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (w."ownerId")
  'legacy_' || md5(s."id"),
  w."ownerId",
  CASE
    WHEN s."plan" = 'PRO' AND s."currentPeriodEnd" IS NOT NULL THEN 'PRO'::"SubscriptionPlan"
    ELSE 'FREE'::"SubscriptionPlan"
  END,
  CASE
    WHEN s."plan" = 'PRO' AND s."currentPeriodEnd" IS NOT NULL THEN 'CANCELLED'::"SubscriptionStatus"
    ELSE 'ACTIVE'::"SubscriptionStatus"
  END,
  s."currentPeriodEnd",
  CASE WHEN s."plan" = 'PRO' AND s."currentPeriodEnd" IS NOT NULL THEN s."updatedAt" ELSE NULL END,
  CASE WHEN s."plan" = 'PRO' AND s."currentPeriodEnd" IS NOT NULL THEN s."currentPeriodEnd" ELSE NULL END,
  s."createdAt",
  s."updatedAt"
FROM "legacy_stripe_subscriptions" s
JOIN "workspaces" w ON w."id" = s."workspaceId"
ORDER BY w."ownerId",
  (s."plan" = 'PRO' AND s."currentPeriodEnd" IS NOT NULL) DESC,
  s."currentPeriodEnd" DESC NULLS LAST,
  s."updatedAt" DESC,
  s."id";

-- The old invoice amount is the only persisted total. Treat it as the subtotal
-- and leave unknown tax/discount values at zero instead of changing the total.
UPDATE "invoices" SET "subtotal" = "amount";

CREATE TABLE "invoice_line_items" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "deliverableId" TEXT,
  CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "paddle_webhook_events" (
  "id" TEXT NOT NULL,
  "paddleEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "paddle_webhook_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "workspace_members" ALTER COLUMN "permissions" DROP DEFAULT;

CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");
CREATE INDEX "invoice_line_items_deliverableId_idx" ON "invoice_line_items"("deliverableId");
CREATE UNIQUE INDEX "paddle_webhook_events_paddleEventId_key" ON "paddle_webhook_events"("paddleEventId");
CREATE INDEX "paddle_webhook_events_eventType_idx" ON "paddle_webhook_events"("eventType");
CREATE INDEX "invoices_status_dueDate_idx" ON "invoices"("status", "dueDate");
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE UNIQUE INDEX "subscriptions_paddleCustomerId_key" ON "subscriptions"("paddleCustomerId");
CREATE UNIQUE INDEX "subscriptions_paddleSubscriptionId_key" ON "subscriptions"("paddleSubscriptionId");

ALTER TABLE "invoice_line_items"
  ADD CONSTRAINT "invoice_line_items_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "invoice_line_items_deliverableId_fkey"
  FOREIGN KEY ("deliverableId") REFERENCES "deliverables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
