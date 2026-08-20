import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  createInvoice,
  getInvoice,
  listInvoices,
} from "@/lib/actions/invoice";
import type { InvoiceListResult, InvoiceResult } from "@/lib/actions/invoice";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";

// ──────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: { getSession: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({
  db: {
    workspace: { findFirst: vi.fn() },
    project: { findFirst: vi.fn() },
    invoice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    activity: { create: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const getSession = vi.mocked(auth.api.getSession);
const findWorkspace = vi.mocked(db.workspace.findFirst);
const findProject = vi.mocked(db.project.findFirst);
const findMany = vi.mocked(db.invoice.findMany);
const findFirst = vi.mocked(db.invoice.findFirst);
const create = vi.mocked(db.invoice.create);

const user = {
  id: "user-1",
  name: "John Doe",
  email: "john@example.com",
  emailVerified: true,
  image: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const workspace = {
  id: "ws-1",
  name: "John's Studio",
  ownerId: "user-1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const invoiceRow = {
  id: "inv-1",
  projectId: "proj-1",
  invoiceNumber: "INV-001",
  description: null,
  amount: { toString: () => "1250.50" } as never,
  currency: "USD",
  dueDate: null,
  status: "DRAFT",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const signedIn = async () => {
  getSession.mockResolvedValue({ session: {} as never, user });
  findWorkspace.mockResolvedValue(workspace);
  findProject.mockResolvedValue({ id: "proj-1" } as never);
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// Response contract
// ──────────────────────────────────────────────

describe("response contract", () => {
  it("every action returns the standardized ActionResponseType union", () => {
    expectTypeOf<Awaited<ReturnType<typeof listInvoices>>>().toEqualTypeOf<
      ActionResponseType<InvoiceListResult>
    >();
    expectTypeOf<Awaited<ReturnType<typeof getInvoice>>>().toEqualTypeOf<
      ActionResponseType<InvoiceResult>
    >();
    expectTypeOf<Awaited<ReturnType<typeof createInvoice>>>().toEqualTypeOf<
      ActionResponseType<InvoiceResult>
    >();
  });

  it("serializes the invoice amount as a string", async () => {
    await signedIn();
    create.mockResolvedValue(invoiceRow as never);

    const result = await createInvoice({
      projectId: "proj-1",
      invoiceNumber: "INV-001",
      amount: "1250.50",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe("1250.50");
      // amount must be a plain string, not a Decimal object.
      expectTypeOf(result.data.amount).toEqualTypeOf<string>();
    }
  });
});

// ──────────────────────────────────────────────
// createInvoice validation
// ──────────────────────────────────────────────

describe("createInvoice validation", () => {
  it("rejects a non-positive or malformed amount", async () => {
    const result = await createInvoice({
      projectId: "proj-1",
      invoiceNumber: "INV-002",
      amount: "-5",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.fieldErrors?.amount).toBeDefined();
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a non-3-letter currency code", async () => {
    const result = await createInvoice({
      projectId: "proj-1",
      invoiceNumber: "INV-002",
      amount: "100",
      currency: "usd",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.fieldErrors?.currency).toBeDefined();
    }
  });
});

// ──────────────────────────────────────────────
// getInvoice scoping
// ──────────────────────────────────────────────

describe("getInvoice", () => {
  it("returns NOT_FOUND when the invoice isn't in the workspace", async () => {
    await signedIn();
    findFirst.mockResolvedValue(null);

    const result = await getInvoice({ id: "inv-missing" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });
});
