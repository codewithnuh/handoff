import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getRequestSubject: vi.fn(),
  requirePortalProjectAccess: vi.fn(),
  resolveProjectAccess: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  db: { invoice: { findUnique: mocks.findUnique } },
}));

vi.mock("@/lib/access", () => ({
  getRequestSubject: mocks.getRequestSubject,
  requirePortalProjectAccess: mocks.requirePortalProjectAccess,
  resolveProjectAccess: mocks.resolveProjectAccess,
}));

import { GET } from "@/app/api/invoices/[id]/pdf/route";
import { NextRequest } from "next/server";

describe("invoice PDF authorization response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestSubject.mockResolvedValue({ kind: "user", user: { id: "user-a" } });
    mocks.resolveProjectAccess.mockResolvedValue({
      ok: false,
      error: { error: { code: "NOT_FOUND" } },
    });
  });

  it("returns the same 404 for a missing invoice and an inaccessible invoice", async () => {
    mocks.findUnique.mockResolvedValue({ id: "invoice-a", projectId: "project-b" });
    const inaccessible = await GET(
      new NextRequest("http://localhost/api/invoices/invoice-a/pdf"),
      { params: Promise.resolve({ id: "invoice-a" }) },
    );
    mocks.findUnique.mockResolvedValue(null);
    const missing = await GET(
      new NextRequest("http://localhost/api/invoices/missing/pdf"),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(inaccessible.status).toBe(404);
    expect(await inaccessible.json()).toEqual({ error: "Invoice not found" });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Invoice not found" });
  });

  it("returns a real PDF response with authenticated invoice and discount data", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "invoice-a",
      invoiceNumber: "INV-001",
      description: "Design work",
      subtotal: { toString: () => "10" },
      discount: { toString: () => "2" },
      taxRate: { toString: () => "0" },
      taxAmount: { toString: () => "0" },
      amount: { toString: () => "8" },
      currency: "USD",
      dueDate: null,
      paidAt: null,
      paymentNotes: null,
      status: "SENT",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      projectId: "project-a",
      project: {
        name: "Project A",
        client: { name: "Client A", email: "client@example.test", company: null },
        workspace: { owner: { name: "Owner A", email: "owner@example.test" } },
      },
      lineItems: [{
        description: "Design",
        quantity: { toString: () => "0.5" },
        unitPrice: { toString: () => "20" },
        amount: { toString: () => "10" },
      }],
    });
    mocks.resolveProjectAccess.mockResolvedValue({
      ok: true,
      value: { user: { name: "Owner A", email: "owner@example.test" } },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/invoices/invoice-a/pdf"),
      { params: Promise.resolve({ id: "invoice-a" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("INV-001.pdf");
    const pdf = Buffer.from(await response.arrayBuffer());
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
