import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  updateClient,
} from "@/lib/actions/client";
import type {
  ClientListResult,
  ClientResult,
  DeleteClientResult,
} from "@/lib/actions/client";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { Prisma } from "@/app/generated/prisma/client";

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
    workspace: { findUnique: vi.fn() },
    client: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
    project: { findFirst: vi.fn() },
    activity: { create: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const getSession = vi.mocked(auth.api.getSession);
const findWorkspace = vi.mocked(db.workspace.findUnique);
const findMany = vi.mocked(db.client.findMany);
const findFirst = vi.mocked(db.client.findFirst);
const create = vi.mocked(db.client.create);
const updateMany = vi.mocked(db.client.updateMany);
const deleteMany = vi.mocked(db.client.deleteMany);

// ──────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────

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

const clientFixture = {
  id: "client-1",
  workspaceId: "ws-1",
  name: "Acme Corp",
  email: "billing@acme.com",
  company: "Acme",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("boom", {
    code,
    clientVersion: "9.0.0",
  });

const signedIn = async () => {
  getSession.mockResolvedValue({ session: {} as never, user });
  findWorkspace.mockResolvedValue(workspace);
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// Response contract
// ──────────────────────────────────────────────

describe("response contract", () => {
  it("every action returns the standardized ActionResponseType union", () => {
    expectTypeOf<Awaited<ReturnType<typeof listClients>>>().toEqualTypeOf<
      ActionResponseType<ClientListResult>
    >();
    expectTypeOf<Awaited<ReturnType<typeof getClient>>>().toEqualTypeOf<
      ActionResponseType<ClientResult>
    >();
    expectTypeOf<Awaited<ReturnType<typeof createClient>>>().toEqualTypeOf<
      ActionResponseType<ClientResult>
    >();
    expectTypeOf<Awaited<ReturnType<typeof updateClient>>>().toEqualTypeOf<
      ActionResponseType<ClientResult>
    >();
    expectTypeOf<Awaited<ReturnType<typeof deleteClient>>>().toEqualTypeOf<
      ActionResponseType<DeleteClientResult>
    >();
  });
});

// ──────────────────────────────────────────────
// Authorization
// ──────────────────────────────────────────────

describe("authorization", () => {
  it("returns UNAUTHORIZED when no session exists", async () => {
    getSession.mockResolvedValue(null);

    const result = await listClients();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
    }
  });

  it("returns NOT_FOUND when the user has no workspace", async () => {
    getSession.mockResolvedValue({ session: {} as never, user });
    findWorkspace.mockResolvedValue(null);

    const result = await listClients();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });
});

// ──────────────────────────────────────────────
// listClients
// ──────────────────────────────────────────────

describe("listClients", () => {
  it("returns the workspace's clients", async () => {
    await signedIn();
    findMany.mockResolvedValue([clientFixture]);

    const result = await listClients();

    expect(result.success).toBe(true);
    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<ClientListResult>();
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].email).toBe("billing@acme.com");
    }
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "ws-1" },
      }),
    );
  });
});

// ──────────────────────────────────────────────
// createClient
// ──────────────────────────────────────────────

describe("createClient", () => {
  it("rejects invalid input with VALIDATION_ERROR and fieldErrors", async () => {
    const result = await createClient({
      name: "",
      email: "not-an-email",
      company: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.fieldErrors).toBeDefined();
      expect(result.error.fieldErrors?.email).toBeDefined();
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a client scoped to the workspace and sanitizes the email", async () => {
    await signedIn();
    create.mockResolvedValue(clientFixture);

    const result = await createClient({
      name: "  Acme Corp  ",
      email: "  BILLING@ACME.com  ",
      company: "Acme",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("client-1");
    }
    expect(create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws-1",
        name: "Acme Corp",
        email: "billing@acme.com",
        company: "Acme",
      },
    });
  });

  it("maps a duplicate email to CONFLICT", async () => {
    await signedIn();
    create.mockRejectedValue(prismaError("P2002"));

    const result = await createClient({
      name: "Acme Corp",
      email: "billing@acme.com",
      company: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
  });
});


// ──────────────────────────────────────────────
// updateClient
// ──────────────────────────────────────────────

describe("updateClient", () => {
  it("returns NOT_FOUND when the client isn't in the workspace", async () => {
    await signedIn();
    updateMany.mockResolvedValue({ count: 0 });

    const result = await updateClient({
      id: "client-999",
      name: "New Name",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });
});

// ──────────────────────────────────────────────
// deleteClient
// ──────────────────────────────────────────────

describe("deleteClient", () => {
  it("maps a referential violation to CONFLICT", async () => {
    await signedIn();
    deleteMany.mockRejectedValue(prismaError("P2003"));

    const result = await deleteClient({ id: "client-1" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
      expect(result.message).toContain("still has projects");
    }
  });

  it("deletes a client within the workspace", async () => {
    await signedIn();
    deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteClient({ id: "client-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<DeleteClientResult>();
      expect(result.data.deleted).toBe(true);
    }
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "client-1", workspaceId: "ws-1" },
    });
  });
});

// ──────────────────────────────────────────────
// getClient
// ──────────────────────────────────────────────

describe("getClient", () => {
  it("returns NOT_FOUND when the client isn't in the workspace", async () => {
    await signedIn();
    findFirst.mockResolvedValue(null);

    const result = await getClient({ id: "client-missing" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });
});

