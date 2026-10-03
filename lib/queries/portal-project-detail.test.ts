import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  projectFindFirst: vi.fn(),
  deliverableFindMany: vi.fn(),
  requestFindMany: vi.fn(),
  invoiceFindMany: vi.fn(),
  activityFindMany: vi.fn(),
  requirePortalProjectAccess: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  db: {
    project: { findFirst: mocks.projectFindFirst },
    deliverable: { findMany: mocks.deliverableFindMany },
    request: { findMany: mocks.requestFindMany },
    invoice: { findMany: mocks.invoiceFindMany },
    activity: { findMany: mocks.activityFindMany },
  },
}));

vi.mock("@/lib/access", () => ({
  requirePortalProjectAccess: mocks.requirePortalProjectAccess,
  resolveProjectAccess: vi.fn(),
}));

import { getPortalProjectDetail } from "@/lib/queries/project-detail";

describe("portal project visibility policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePortalProjectAccess.mockResolvedValue({ ok: true, value: { projectId: "project-a" } });
    mocks.projectFindFirst.mockResolvedValue({
      id: "project-a",
      name: "Project A",
      client: { id: "client-a", name: "Client A", email: "a@example.test", company: null },
    });
    mocks.deliverableFindMany.mockResolvedValue([]);
    mocks.requestFindMany.mockResolvedValue([]);
    mocks.invoiceFindMany.mockResolvedValue([]);
    mocks.activityFindMany.mockResolvedValue([]);
  });

  it("filters drafts and unsent invoices before returning portal data", async () => {
    await getPortalProjectDetail("project-a", "a@example.test");

    expect(mocks.deliverableFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project-a", status: { not: "DRAFT" } },
      }),
    );
    expect(mocks.invoiceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project-a", status: { in: ["SENT", "PAID", "OVERDUE"] } },
      }),
    );
  });

  it("does not query detail data without explicit project access", async () => {
    mocks.requirePortalProjectAccess.mockResolvedValue({ ok: false, error: {} });

    expect(await getPortalProjectDetail("project-a", "other@example.test")).toBeNull();
    expect(mocks.projectFindFirst).not.toHaveBeenCalled();
  });
});
