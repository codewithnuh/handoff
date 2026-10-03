import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { findFile, getSubject, projectAccess, portalAccess, sign } = vi.hoisted(() => ({
  findFile: vi.fn(),
  getSubject: vi.fn(),
  projectAccess: vi.fn(),
  portalAccess: vi.fn(),
  sign: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ db: { file: { findUnique: findFile } } }));
vi.mock("@/lib/access/subject", () => ({ getRequestSubject: getSubject }));
vi.mock("@/lib/access/project", () => ({ resolveProjectAccess: projectAccess }));
vi.mock("@/lib/access/portal", () => ({ requirePortalProjectAccess: portalAccess }));
vi.mock("@/lib/files/storage", () => ({
  fileStorage: { generateSignedURL: sign },
  PRIVATE_DOWNLOAD_TTL_SECONDS: 60,
}));

import { GET } from "./route";

describe("private file downloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFile.mockResolvedValue({ id: "file-a", key: "provider-key", projectId: "project-a" });
    getSubject.mockResolvedValue({ kind: "user", user: { id: "user-a" } });
    projectAccess.mockResolvedValue({ ok: true, value: {} });
    portalAccess.mockResolvedValue({ ok: true, value: {} });
    sign.mockResolvedValue({ ufsUrl: "https://private.ufs.sh/signed-token" });
  });

  it("authorizes dashboard and portal access before issuing a one-minute signed URL", async () => {
    const dashboardResponse = await GET(
      new NextRequest("http://localhost/api/files/file-a/download"),
      { params: Promise.resolve({ id: "file-a" }) },
    );
    expect(projectAccess).toHaveBeenCalledWith("project-a");
    expect(sign).toHaveBeenCalledWith("provider-key", 60);
    expect(dashboardResponse.headers.get("location")).toBe("https://private.ufs.sh/signed-token");
    expect(dashboardResponse.headers.get("cache-control")).toContain("no-store");
    expect(dashboardResponse.headers.get("referrer-policy")).toBe("no-referrer");

    getSubject.mockResolvedValueOnce({ kind: "client", session: { email: "client@example.test" } });
    await GET(new NextRequest("http://localhost/api/files/file-a/download"), {
      params: Promise.resolve({ id: "file-a" }),
    });
    expect(portalAccess).toHaveBeenCalledWith("client@example.test", "project-a");
  });

  it("does not issue a provider URL for missing, unowned, or unauthorized files", async () => {
    findFile.mockResolvedValueOnce(null);
    expect((await GET(new NextRequest("http://localhost/api/files/file-a/download"), { params: Promise.resolve({ id: "file-a" }) })).status).toBe(404);

    findFile.mockResolvedValueOnce({ id: "file-a", key: "provider-key", projectId: null });
    expect((await GET(new NextRequest("http://localhost/api/files/file-a/download"), { params: Promise.resolve({ id: "file-a" }) })).status).toBe(404);

    projectAccess.mockResolvedValueOnce({ ok: false, error: {} });
    expect((await GET(new NextRequest("http://localhost/api/files/file-a/download"), { params: Promise.resolve({ id: "file-a" }) })).status).toBe(404);
    expect(sign).not.toHaveBeenCalled();
  });
});
