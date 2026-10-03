import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/app/generated/prisma/client";
import { computeTotals, roundToPrecision, toScaledInteger } from "@/lib/invoice/totals";
import {
  createInvoiceWithNumber,
  recalculateInvoice,
  toDecimal,
  toQuantityDecimal,
} from "@/lib/invoice/money";

vi.mock("@/lib/prisma", async () => ({
  db: (await import("@/lib/test/fake-db")).fakeDb,
}));

import { db } from "@/lib/prisma";

const asTransaction = () => {
  vi.mocked(db.$transaction).mockImplementation(async (fn) => fn(db as never));
};

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.12.0",
  });

beforeEach(() => {
  vi.clearAllMocks();
  asTransaction();
});

describe("computeTotals", () => {
  it("applies discount then tax to the taxable amount", () => {
    expect(computeTotals({ lineItems: [{ quantity: 1, unitPrice: 100 }], discount: 20, taxRate: 10 })).toEqual({
      subtotal: 100,
      discount: 20,
      taxableAmount: 80,
      taxAmount: 8,
      total: 88,
    });
  });

  it("never taxes a negative taxable amount", () => {
    expect(computeTotals({ lineItems: [{ quantity: 1, unitPrice: 10 }], discount: 150, taxRate: 20 })).toEqual({
      subtotal: 10,
      discount: 150,
      taxableAmount: 0,
      taxAmount: 0,
      total: 0,
    });
  });

  it("rounds every figure to storage precision", () => {
    const totals = computeTotals({ lineItems: [{ quantity: 1, unitPrice: 33.333 }], discount: 0, taxRate: 7.25 });
    expect(totals.subtotal).toBe(33.33);
    expect(totals.taxAmount).toBe(2.42);
    expect(totals.total).toBe(35.75);
  });

  it("adds decimal line amounts exactly and rounds half-cent products up", () => {
    expect(computeTotals({
      lineItems: [{ quantity: 1, unitPrice: 0.1 }, { quantity: 1, unitPrice: 0.2 }],
      discount: 0,
      taxRate: 0,
    }).subtotal).toBe(0.3);
    expect(computeTotals({
      lineItems: [{ quantity: 0.5, unitPrice: 0.01 }],
      discount: 0,
      taxRate: 0,
    }).subtotal).toBe(0.01);
    expect(computeTotals({
      lineItems: [{ quantity: 1, unitPrice: 0.1 }],
      discount: 0,
      taxRate: 5,
    }).taxAmount).toBe(0.01);
  });

  it("supports zero and the largest stored money value without losing cents", () => {
    expect(computeTotals({ lineItems: [], discount: 0, taxRate: 0 }).total).toBe(0);
    expect(toScaledInteger("9999999999.99", 2)).toBe(BigInt("999999999999"));
  });

  it("uses the currency's configured minor-unit precision", () => {
    expect(computeTotals({
      lineItems: [{ quantity: 1, unitPrice: 100 }], discount: 0, taxRate: 10, currency: "JPY",
    })).toEqual({ subtotal: 100, discount: 0, taxableAmount: 100, taxAmount: 10, total: 110 });
  });
});

describe("roundToPrecision", () => {
  it("keeps two decimals and drops the rest", () => {
    expect(roundToPrecision(1.234, 2)).toBe("1.23");
    expect(roundToPrecision(10, 2)).toBe("10.00");
  });
});

describe("toDecimal", () => {
  it("maps a number through 2-decimal storage precision", () => {
    expect(toDecimal(10.5).toFixed(2)).toBe("10.50");
    expect(toDecimal(1.005).toFixed(2)).toBe("1.01");
    expect(toDecimal(17.7).toFixed(2)).toBe("17.70");
  });

  it("passes an already-formatted string through", () => {
    expect(toDecimal("0.00").toFixed(2)).toBe("0.00");
  });

  it("stores fractional quantities at three decimal places", () => {
    expect(toQuantityDecimal(0.125).toFixed(3)).toBe("0.125");
  });
});

describe("recalculateInvoice", () => {
  it("computes and writes the totals in one transaction", async () => {
    vi.mocked(db.invoiceLineItem.findMany).mockResolvedValue([
      { amount: 10.75 },
      { amount: 5 },
    ] as never);
    vi.mocked(db.invoice.findUnique).mockResolvedValue({
      taxRate: 20,
      discount: 1,
      currency: "USD",
      id: "inv-1",
      status: "DRAFT",
    } as never);
    vi.mocked(db.$queryRaw).mockResolvedValue([{ id: "inv-1" }] as never);

    await recalculateInvoice("inv-1");

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: {
        subtotal: toDecimal(15.75),
        taxAmount: toDecimal(2.95),
        amount: toDecimal(17.7),
      },
    });
  });

  it("does nothing when the invoice is gone", async () => {
    vi.mocked(db.invoiceLineItem.findMany).mockResolvedValue([] as never);
    vi.mocked(db.$queryRaw).mockResolvedValue([] as never);

    await recalculateInvoice("missing");

    expect(db.invoice.update).not.toHaveBeenCalled();
  });
});

describe("createInvoiceWithNumber", () => {
  it("starts at INV-001 for a project with no invoices", async () => {
    vi.mocked(db.invoice.findMany).mockResolvedValue([] as never);
    vi.mocked(db.invoice.create).mockResolvedValue({ id: "inv-1" } as never);

    await createInvoiceWithNumber("proj-1", {});

    expect(db.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "proj-1",
        invoiceNumber: "INV-001",
      }),
    });
  });

  it("numbers from the highest stored invoice, not the newest row", async () => {
    vi.mocked(db.invoice.findMany).mockResolvedValue([
      { invoiceNumber: "INV-002" },
      { invoiceNumber: "INV-010" },
      { invoiceNumber: "not-an-invoice" },
    ] as never);
    vi.mocked(db.invoice.create).mockResolvedValue({ id: "inv-1" } as never);

    await createInvoiceWithNumber("proj-1", {});

    expect(db.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ invoiceNumber: "INV-011" }),
    });
  });

  it("retries with the next number when it loses the allocation race", async () => {
    vi.mocked(db.invoice.findMany).mockResolvedValue([] as never);
    vi.mocked(db.invoice.create)
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce({ id: "inv-2" } as never);

    const result = await createInvoiceWithNumber("proj-1", {});

    expect(db.invoice.create).toHaveBeenCalledTimes(2);
    expect(result.id).toBe("inv-2");
  });

  it("gives up after three collisions and surfaces the conflict", async () => {
    vi.mocked(db.invoice.findMany).mockResolvedValue([] as never);
    vi.mocked(db.invoice.create).mockRejectedValue(uniqueViolation());

    await expect(createInvoiceWithNumber("proj-1", {})).rejects.toThrow(
      "Unique constraint failed",
    );
    expect(db.invoice.create).toHaveBeenCalledTimes(3);
  });

  it("does not retry errors that are not number collisions", async () => {
    vi.mocked(db.invoice.findMany).mockResolvedValue([] as never);
    vi.mocked(db.invoice.create).mockRejectedValue(new Error("db down"));

    await expect(createInvoiceWithNumber("proj-1", {})).rejects.toThrow(
      "db down",
    );
    expect(db.invoice.create).toHaveBeenCalledTimes(1);
  });

  it("creates the line items and first recalculation in the same transaction", async () => {
    vi.mocked(db.invoice.findMany).mockResolvedValue([] as never);
    vi.mocked(db.invoice.create).mockResolvedValue({ id: "inv-1" } as never);
    vi.mocked(db.invoiceLineItem.findMany).mockResolvedValue([
      { amount: 21.5 },
    ] as never);
    vi.mocked(db.invoice.findUnique)
      .mockResolvedValueOnce({ taxRate: 0, discount: 0, currency: "USD" } as never)
      .mockResolvedValueOnce({ id: "inv-1", subtotal: toDecimal(21.5), amount: toDecimal(21.5) } as never);

    await createInvoiceWithNumber("proj-1", { currency: "USD" }, [
      { description: "Design work", quantity: 2, unitPrice: 10.75 },
    ]);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.invoiceLineItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          invoiceId: "inv-1",
          description: "Design work",
          quantity: toQuantityDecimal(2),
          unitPrice: toDecimal(10.75),
          amount: toDecimal(21.5),
          deliverableId: null,
        },
      ],
    });
    expect(db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inv-1" } }),
    );
  });
});
