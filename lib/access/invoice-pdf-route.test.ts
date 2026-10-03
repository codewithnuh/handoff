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
});
