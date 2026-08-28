import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertCanCreateWorkspace,
  assertCanCreateProject,
  getEffectivePlan,
} from "@/lib/services/plan-limits";
import { db } from "@/lib/prisma";
import { ERROR_CODES } from "@/lib/constants/errors";

// ──────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  db: {
    workspace: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    project: {
      count: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

const workspaceCount = vi.mocked(db.workspace.count);
const findFirstWorkspace = vi.mocked(db.workspace.findFirst);
const findWorkspaceUnique = vi.mocked(db.workspace.findUnique);
const projectCount = vi.mocked(db.project.count);
const findSubscription = vi.mocked(db.subscription.findUnique);

// ──────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────

const freeSubscription = {
  plan: "FREE",
  status: "ACTIVE",
  canceledAt: null,
  pausedAt: null,
  gracePeriodEndsAt: null,
};

const proSubscription = {
  plan: "PRO",
  status: "ACTIVE",
  canceledAt: null,
  pausedAt: null,
  gracePeriodEndsAt: null,
};

const canceledProInGrace = {
  plan: "PRO",
  status: "CANCELLED",
  canceledAt: new Date("2026-08-01"),
  pausedAt: null,
  gracePeriodEndsAt: new Date("2099-12-31"), // far future = still in grace
};

const canceledProGraceExpired = {
  plan: "PRO",
  status: "CANCELLED",
  canceledAt: new Date("2026-01-01"),
  pausedAt: null,
  gracePeriodEndsAt: new Date("2026-01-31"), // already past
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// assertCanCreateWorkspace
// ──────────────────────────────────────────────

describe("assertCanCreateWorkspace", () => {
  it("allows creation when under the FREE limit (0 workspaces, max 1)", async () => {
    workspaceCount.mockResolvedValue(0);
    findSubscription.mockResolvedValue(freeSubscription as never);

    const result = await assertCanCreateWorkspace("user-1");
    expect(result.ok).toBe(true);
  });

  it("blocks creation when at the FREE limit (1 workspace, max 1)", async () => {
    workspaceCount.mockResolvedValue(1);
    findSubscription.mockResolvedValue(freeSubscription as never);

    const result = await assertCanCreateWorkspace("user-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error.code).toBe(ERROR_CODES.PLAN_LIMIT_EXCEEDED);
      expect(result.error.message).toContain("FREE");
      expect(result.error.message).toContain("Upgrade");
    }
  });

  it("allows creation when under the PRO limit (2 workspaces, max 3)", async () => {
    workspaceCount.mockResolvedValue(2);
    findSubscription.mockResolvedValue(proSubscription as never);

    const result = await assertCanCreateWorkspace("user-1");
    expect(result.ok).toBe(true);
  });

  it("blocks creation when at the PRO limit (5 workspaces)", async () => {
    workspaceCount.mockResolvedValue(5);
    findSubscription.mockResolvedValue(proSubscription as never);

    const result = await assertCanCreateWorkspace("user-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error.code).toBe(ERROR_CODES.PLAN_LIMIT_EXCEEDED);
      expect(result.error.message).toContain("5 workspaces");
    }
  });

  it("drops to FREE limits after grace period expires", async () => {
    // User had PRO, canceled, grace period expired — effectively FREE (max 1)
    workspaceCount.mockResolvedValue(2);
    findSubscription.mockResolvedValue(canceledProGraceExpired as never);

    const result = await assertCanCreateWorkspace("user-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error.code).toBe(ERROR_CODES.PLAN_LIMIT_EXCEEDED);
      expect(result.error.message).toContain("FREE");
      expect(result.error.message).toContain("downgrade");
    }
  });

  it("still allows during grace period (PRO limits apply)", async () => {
    workspaceCount.mockResolvedValue(2);
    findSubscription.mockResolvedValue(canceledProInGrace as never);

    const result = await assertCanCreateWorkspace("user-1");
    expect(result.ok).toBe(true);
  });
});

// ──────────────────────────────────────────────
// assertCanCreateProject
// ──────────────────────────────────────────────

describe("assertCanCreateProject", () => {
  it("allows creation when under the FREE project limit", async () => {
    findWorkspaceUnique.mockResolvedValue({ ownerId: "user-1" } as never);
    findSubscription.mockResolvedValue(freeSubscription as never);
    projectCount.mockResolvedValue(2);

    const result = await assertCanCreateProject("ws-1");
    expect(result.ok).toBe(true);
  });

  it("blocks creation when at the FREE project limit (3 projects)", async () => {
    findWorkspaceUnique.mockResolvedValue({ ownerId: "user-1" } as never);
    findSubscription.mockResolvedValue(freeSubscription as never);
    projectCount.mockResolvedValue(3);

    const result = await assertCanCreateProject("ws-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error.code).toBe(ERROR_CODES.PLAN_LIMIT_EXCEEDED);
      expect(result.error.message).toContain("3");
    }
  });

  it("allows creation when under the PRO project limit (40 projects, max 100)", async () => {
    findWorkspaceUnique.mockResolvedValue({ ownerId: "user-1" } as never);
    findSubscription.mockResolvedValue(proSubscription as never);
    projectCount.mockResolvedValue(40);

    const result = await assertCanCreateProject("ws-1");
    expect(result.ok).toBe(true);
  });

  it("blocks creation when at the PRO project limit (100 projects)", async () => {
    findWorkspaceUnique.mockResolvedValue({ ownerId: "user-1" } as never);
    findSubscription.mockResolvedValue(proSubscription as never);
    projectCount.mockResolvedValue(100);

    const result = await assertCanCreateProject("ws-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error.code).toBe(ERROR_CODES.PLAN_LIMIT_EXCEEDED);
      expect(result.error.message).toContain("100");
    }
  });

  it("drops to FREE project limits after grace period", async () => {
    // Was PRO with 15 projects — after downgrade, FREE limit is 10
    findWorkspaceUnique.mockResolvedValue({ ownerId: "user-1" } as never);
    findSubscription.mockResolvedValue(canceledProGraceExpired as never);
    projectCount.mockResolvedValue(15);

    const result = await assertCanCreateProject("ws-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error.code).toBe(ERROR_CODES.PLAN_LIMIT_EXCEEDED);
      expect(result.error.message).toContain("downgrade");
    }
  });
});

// ──────────────────────────────────────────────
// getEffectivePlan
// ──────────────────────────────────────────────

describe("getEffectivePlan", () => {
  it("returns FREE plan for active FREE subscription", async () => {
    findSubscription.mockResolvedValue(freeSubscription as never);

    const result = await getEffectivePlan("ws-1");
    expect(result.plan).toBe("FREE");
    expect(result.isDowngraded).toBe(false);
    expect(result.limits.maxWorkspaces).toBe(1);
    expect(result.limits.maxProjectsPerWorkspace).toBe(3);
  });

  it("returns PRO plan for active PRO subscription", async () => {
    findSubscription.mockResolvedValue(proSubscription as never);

    const result = await getEffectivePlan("ws-1");
    expect(result.plan).toBe("PRO");
    expect(result.isDowngraded).toBe(false);
    expect(result.limits.maxWorkspaces).toBe(5);
    expect(result.limits.maxProjectsPerWorkspace).toBe(100);
  });

  it("returns PRO plan during grace period (not yet downgraded)", async () => {
    findSubscription.mockResolvedValue(canceledProInGrace as never);

    const result = await getEffectivePlan("ws-1");
    expect(result.plan).toBe("PRO");
    expect(result.isDowngraded).toBe(false);
  });

  it("returns FREE plan after grace period (downgraded)", async () => {
    findSubscription.mockResolvedValue(canceledProGraceExpired as never);

    const result = await getEffectivePlan("ws-1");
    expect(result.plan).toBe("FREE");
    expect(result.isDowngraded).toBe(true);
    expect(result.limits.maxWorkspaces).toBe(1);
    expect(result.limits.maxProjectsPerWorkspace).toBe(3);
  });

  it("returns FREE defaults when no subscription exists", async () => {
    findSubscription.mockResolvedValue(null);

    const result = await getEffectivePlan("ws-1");
    expect(result.plan).toBe("FREE");
    expect(result.isDowngraded).toBe(false);
    expect(result.limits.maxWorkspaces).toBe(1);
  });
});
