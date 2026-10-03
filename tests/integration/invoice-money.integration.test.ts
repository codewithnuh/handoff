import { AsyncLocalStorage } from "node:async_hooks";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { addLineItem, cancelInvoice, convertDeliverablesToLineItems, createInvoice, markInvoicePaid, removeLineItem, sendInvoice, updateInvoice } from "@/lib/actions/invoice";
import { recordActivity } from "@/lib/actions/activity";
import { setSubjectAdapters } from "@/lib/access";
import { db } from "@/lib/prisma";
import { fixtureIds, seedIntegrationFixtures } from "./fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const actorContext = new AsyncLocalStorage<string>();
let restoreSubjects: (() => void) | undefined;
let invoiceCounter = 0;
let deliverableCounter = 0;

function asOwner<T>(action: () => Promise<T>) {
  return actorContext.run(fixtureIds.ownerA, action);
}

function startTogether<const T extends readonly (() => Promise<unknown>)[]>(actions: T) {
  let waiting = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  return Promise.all(actions.map(async (action) => {
    waiting += 1;
    if (waiting === actions.length) release();
    await gate;
    return action();
  })) as Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>;
}

async function newInvoice(input: {
  status?: "DRAFT" | "SENT" | "OVERDUE" | "PAID" | "CANCELLED";
  amount?: string;
  discount?: string;
  currency?: string;
} = {}) {
  const sequence = ++invoiceCounter;
  return db.invoice.create({
    data: {
      id: `itest_cod85_invoice_${sequence}`,
      projectId: fixtureIds.projectA,
      invoiceNumber: `COD85-${sequence}`,
      status: input.status ?? "DRAFT",
      currency: input.currency ?? "USD",
      discount: input.discount ?? "0.00",
      subtotal: input.amount ?? "0.00",
      amount: input.amount ?? "0.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

beforeAll(async () => {
  await seedIntegrationFixtures(db);
  restoreSubjects = setSubjectAdapters({
    getUser: async () => {
      const userId = actorContext.getStore();
      return userId ? db.user.findUnique({ where: { id: userId } }) : null;
    },
  });
});

afterAll(() => restoreSubjects?.());

describe("invoice money and lifecycle against PostgreSQL", () => {
  it("preserves invoice history and unrelated workspaces when project deletion is attempted", async () => {
    const originalInvoice = await db.invoice.findUniqueOrThrow({ where: { id: fixtureIds.invoice } });

    await expect(db.project.delete({ where: { id: fixtureIds.projectA } })).rejects.toThrow();

    const [project, invoice, unrelatedWorkspace] = await Promise.all([
      db.project.findUnique({ where: { id: fixtureIds.projectA } }),
      db.invoice.findUnique({ where: { id: fixtureIds.invoice } }),
      db.workspace.findUnique({ where: { id: fixtureIds.workspaceB } }),
    ]);
    expect(project?.id).toBe(fixtureIds.projectA);
    expect(invoice?.id).toBe(originalInvoice.id);
    expect(invoice?.amount.toFixed(2)).toBe(originalInvoice.amount.toFixed(2));
    expect(unrelatedWorkspace?.id).toBe(fixtureIds.workspaceB);
  });

  it("rolls a business update back when its required activity insert fails", async () => {
    const before = await db.project.findUniqueOrThrow({ where: { id: fixtureIds.projectA } });
    await expect(db.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: fixtureIds.projectA },
        data: { description: "This must roll back with activity." },
      });
      await recordActivity({
        projectId: "missing-project-for-failure-injection",
        type: "COMMENT_ADDED",
      }, tx);
    })).rejects.toThrow();

    const after = await db.project.findUniqueOrThrow({ where: { id: fixtureIds.projectA } });
    expect(after.description).toBe(before.description);
  });

  it("persists fractional quantities and returns the recalculated stored totals", async () => {
    const result = await asOwner(() => createInvoice({
      projectId: fixtureIds.projectA,
      currency: "USD",
      taxRate: 7.25,
      discount: 0,
      lineItems: [{ description: "Fractional work", quantity: 0.125, unitPrice: 8.02 }],
    }));
    expect(result.success, JSON.stringify(result)).toBe(true);
    if (!result.success) return;

    const [saved, item] = await Promise.all([
      db.invoice.findUniqueOrThrow({ where: { id: result.data.id } }),
      db.invoiceLineItem.findFirstOrThrow({ where: { invoiceId: result.data.id } }),
    ]);
    expect(String(item.quantity)).toBe("0.125");
    expect(item.amount.toFixed(2)).toBe("1.00");
    expect(saved.subtotal.toFixed(2)).toBe("1.00");
    expect(saved.taxAmount.toFixed(2)).toBe("0.07");
    expect(saved.amount.toFixed(2)).toBe("1.07");
    expect(result.data.amount.toFixed(2)).toBe(saved.amount.toFixed(2));
  });

  it("serializes concurrent line additions and keeps 0.1 + 0.2 exact", async () => {
    const invoice = await newInvoice();
    const results = await startTogether([
      () => asOwner(() => addLineItem({ invoiceId: invoice.id, description: "First", unitPrice: "0.10", quantity: 1 })),
      () => asOwner(() => addLineItem({ invoiceId: invoice.id, description: "Second", unitPrice: "0.20", quantity: 1 })),
    ] as const);
    expect(results.every((result) => result.success), JSON.stringify(results)).toBe(true);

    const saved = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    expect(saved.lineItems).toHaveLength(2);
    expect(String(saved.subtotal)).toBe("0.3");
    expect(String(saved.amount)).toBe("0.3");

    const firstItem = saved.lineItems.find((item) => item.description === "First");
    if (!firstItem) throw new Error("First concurrent line item is missing");
    const [added, removed] = await startTogether([
      () => asOwner(() => addLineItem({ invoiceId: invoice.id, description: "Third", unitPrice: "0.30", quantity: 1 })),
      () => asOwner(() => removeLineItem({ id: firstItem.id })),
    ] as const);
    expect(added.success, JSON.stringify(added)).toBe(true);
    expect(removed.success, JSON.stringify(removed)).toBe(true);
    const afterConcurrentRemove = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    expect(afterConcurrentRemove.lineItems).toHaveLength(2);
    expect(afterConcurrentRemove.amount.toFixed(2)).toBe("0.50");
  });

  it("makes edits and send mutually ordered, never allowing a sent invoice to change", async () => {
    const invoice = await newInvoice();
    const [edit, send] = await startTogether([
      () => asOwner(() => addLineItem({ invoiceId: invoice.id, description: "Race", unitPrice: "4.25", quantity: 1 })),
      () => asOwner(() => sendInvoice({ id: invoice.id })),
    ] as const);
    expect(send.success, JSON.stringify({ edit, send })).toBe(true);
    const saved = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    expect(saved.status).toBe("SENT");
    expect(String(saved.amount)).toBe(saved.lineItems.length ? "4.25" : "0");
    if (!edit.success) expect(edit.error.code).toBe("CONFLICT");

    const lateEdit = await asOwner(() => addLineItem({ invoiceId: invoice.id, description: "Late", unitPrice: "1.00", quantity: 1 }));
    expect(lateEdit).toMatchObject({ success: false, error: { code: "CONFLICT" } });
  });

  it("serializes invoice detail edits against sending", async () => {
    const invoice = await newInvoice();
    const [edit, send] = await startTogether([
      () => asOwner(() => updateInvoice({ id: invoice.id, description: "Updated before send" })),
      () => asOwner(() => sendInvoice({ id: invoice.id })),
    ] as const);
    expect(send.success, JSON.stringify({ edit, send })).toBe(true);
    const saved = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(saved.status).toBe("SENT");
    expect([null, "Updated before send"]).toContain(saved.description);
    if (!edit.success) expect(edit.error.code).toBe("CONFLICT");
  });

  it("does not remove the last item when that would make discount exceed subtotal", async () => {
    const invoice = await newInvoice({ amount: "5.00", discount: "4.00" });
    const item = await db.invoiceLineItem.create({
      data: { invoiceId: invoice.id, description: "Keep me", quantity: 1, unitPrice: "5.00", amount: "5.00" },
    });
    const result = await asOwner(() => removeLineItem({ id: item.id }));
    expect(result).toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } });
    expect(await db.invoiceLineItem.count({ where: { invoiceId: invoice.id } })).toBe(1);
  });

  it("rejects an excessive discount without changing persisted values", async () => {
    const invoice = await newInvoice({ amount: "2.00" });
    await db.invoiceLineItem.create({
      data: { invoiceId: invoice.id, description: "Service", quantity: 1, unitPrice: "2.00", amount: "2.00" },
    });
    const result = await asOwner(() => updateInvoice({ id: invoice.id, description: "Keep totals", discount: 3 }));
    expect(result).toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } });
    const saved = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(String(saved.discount)).toBe("0");
    expect(String(saved.amount)).toBe("2");
  });

  it("allows a deliverable conversion to replay concurrently without duplicate rows", async () => {
    const invoice = await newInvoice();
    const deliverable = await db.deliverable.create({
      data: {
        id: `itest_cod85_deliverable_${++deliverableCounter}`,
        projectId: fixtureIds.projectA,
        title: "Approved work",
        status: "APPROVED",
      },
    });
    const results = await startTogether([
      () => asOwner(() => convertDeliverablesToLineItems({ projectId: fixtureIds.projectA, invoiceId: invoice.id, deliverableIds: [deliverable.id] })),
      () => asOwner(() => convertDeliverablesToLineItems({ projectId: fixtureIds.projectA, invoiceId: invoice.id, deliverableIds: [deliverable.id] })),
    ] as const);
    expect(results.every((result) => result.success), JSON.stringify(results)).toBe(true);
    expect(results.reduce((sum, result) => sum + (result.success ? result.data.converted : 0), 0)).toBe(1);
    expect(await db.invoiceLineItem.count({ where: { invoiceId: invoice.id, deliverableId: deliverable.id } })).toBe(1);
  });

  it("allows only one concurrent paid transition and records one audit row", async () => {
    const invoice = await newInvoice({ status: "SENT", amount: "1.00" });
    const results = await startTogether([
      () => asOwner(() => markInvoicePaid({ id: invoice.id })),
      () => asOwner(() => markInvoicePaid({ id: invoice.id })),
    ] as const);
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(results.filter((result) => !result.success && result.error.code === "CONFLICT")).toHaveLength(1);
    const auditRows = await db.activity.findMany({ where: { projectId: fixtureIds.projectA, type: "INVOICE_PAID" } });
    expect(auditRows.filter((row) => (row.meta as { invoiceNumber?: string } | null)?.invoiceNumber === invoice.invoiceNumber)).toHaveLength(1);
  });

  it("allocates unique invoice numbers for concurrent creates", async () => {
    const results = await startTogether([
      () => asOwner(() => createInvoice({
        projectId: fixtureIds.projectA,
        description: "Concurrent create A",
        currency: "USD",
        discount: 0,
        taxRate: 0,
        lineItems: [{ description: "Service A", quantity: 1, unitPrice: 2.5 }],
      })),
      () => asOwner(() => createInvoice({
        projectId: fixtureIds.projectA,
        description: "Concurrent create B",
        currency: "USD",
        discount: 0,
        taxRate: 0,
        lineItems: [{ description: "Service B", quantity: 1, unitPrice: 3.5 }],
      })),
    ] as const);
    expect(results.every((result) => result.success), JSON.stringify(results)).toBe(true);
    const numbers = results.flatMap((result) => result.success ? [result.data.invoiceNumber] : []);
    expect(new Set(numbers).size).toBe(2);
  });

  it("rolls back invoice and totals when the required activity insert fails", async () => {
    await db.$executeRaw`
      CREATE OR REPLACE FUNCTION "cod85_fail_invoice_activity"()
      RETURNS trigger LANGUAGE plpgsql AS $body$
      BEGIN
        IF NEW."type" = 'INVOICE_CREATED'
          AND EXISTS (
            SELECT 1 FROM "invoices"
            WHERE "id" = NEW."meta"->>'invoiceId'
              AND "description" = 'COD85 activity rollback fixture'
          ) THEN
          RAISE EXCEPTION 'injected COD-85 activity failure';
        END IF;
        RETURN NEW;
      END;
      $body$
    `;
    await db.$executeRaw`
      CREATE TRIGGER "cod85_fail_invoice_activity_trigger"
      BEFORE INSERT ON "activities"
      FOR EACH ROW EXECUTE FUNCTION "cod85_fail_invoice_activity"()
    `;
    try {
      const result = await asOwner(() => createInvoice({
        projectId: fixtureIds.projectA,
        description: "COD85 activity rollback fixture",
        currency: "USD",
        discount: 0,
        taxRate: 0,
        lineItems: [{ description: "Rollback line", quantity: 1, unitPrice: 1.25 }],
      }));
      expect(result.success).toBe(false);
      expect(await db.invoice.count({ where: { projectId: fixtureIds.projectA, description: "COD85 activity rollback fixture" } })).toBe(0);
    } finally {
      await db.$executeRaw`DROP TRIGGER IF EXISTS "cod85_fail_invoice_activity_trigger" ON "activities"`;
      await db.$executeRaw`DROP FUNCTION IF EXISTS "cod85_fail_invoice_activity"()`;
    }
  });

  it("rejects invalid transitions from cancelled or paid states", async () => {
    const paid = await newInvoice({ status: "PAID", amount: "1.00" });
    const cancelled = await newInvoice({ status: "CANCELLED" });
    const results = await Promise.all([
      asOwner(() => cancelInvoice({ id: paid.id })),
      asOwner(() => sendInvoice({ id: cancelled.id })),
    ]);
    expect(results.every((result) => !result.success && result.error.code === "CONFLICT")).toBe(true);
  });
});
