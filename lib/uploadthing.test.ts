import { beforeEach, describe, expect, it, vi } from "vitest";
import { UTFiles } from "uploadthing/server";

const { getSession, intentCreate, transaction, fileCreate, fileFind, deleteByKey, authorize } = vi.hoisted(() => ({
  getSession: vi.fn(),
  intentCreate: vi.fn(),
  transaction: vi.fn(),
  fileCreate: vi.fn(),
  fileFind: vi.fn(),
  deleteByKey: vi.fn(),
  authorize: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("@/lib/prisma", () => ({
  db: {
    fileUploadIntent: { create: intentCreate, update: vi.fn(), updateMany: vi.fn() },
    $transaction: transaction,
  },
}));
vi.mock("@/lib/files/upload-authorization", () => ({ authorizeProjectUpload: authorize }));
vi.mock("@/lib/files/storage", () => ({
  fileStorage: {
    generateSignedURL: vi.fn(),
    deleteByKey,
    deleteByCustomId: vi.fn(),
    listFiles: vi.fn(),
    makePrivate: vi.fn(),
  },
  PRIVATE_DOWNLOAD_TTL_SECONDS: 60,
}));

import { ourFileRouter } from "./uploadthing";

const route = ourFileRouter.deliverableFile as unknown as {
  middleware: (args: unknown) => Promise<Record<PropertyKey, unknown>>;
  onUploadComplete: (args: unknown) => Promise<{ fileId: string }>;
  routerConfig: Record<string, { acl?: string }>;
};

const validFile = { name: "brief.pdf", size: 20, type: "application/pdf" };

describe("private project upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ user: { id: "user-a" } });
    authorize.mockResolvedValue({ projectId: "project-a", workspaceId: "workspace-a", userId: "user-a" });
    intentCreate.mockResolvedValue({ id: "intent-a" });
    transaction.mockImplementation((callback) => callback({
      fileUploadIntent: {
        findUnique: vi.fn().mockResolvedValue({ id: "intent-a", projectId: "project-a", userId: "user-a", providerKey: null, status: "PENDING", expiresAt: new Date(Date.now() + 60_000) }),
        update: vi.fn(),
      },
      file: { create: fileCreate, findUnique: fileFind },
    }));
    fileCreate.mockResolvedValue({ id: "file-a", filename: "brief.pdf", size: 20, mimeType: "application/pdf" });
    fileFind.mockResolvedValue(null);
    deleteByKey.mockResolvedValue({ success: true, deletedCount: 1 });
  });

  it("denies signed-out and unauthorized uploads before creating an intent", async () => {
    getSession.mockResolvedValueOnce(null);
    await expect(route.middleware({ req: { headers: new Headers() }, input: { projectId: "project-a" }, files: [validFile] })).rejects.toThrow();
    expect(intentCreate).not.toHaveBeenCalled();

    authorize.mockRejectedValueOnce(new Error("observer cannot upload"));
    await expect(route.middleware({ req: { headers: new Headers() }, input: { projectId: "project-a" }, files: [validFile] })).rejects.toThrow("observer cannot upload");
    expect(intentCreate).not.toHaveBeenCalled();
  });

  it("binds one accepted upload to a server-created intent and private ACL", async () => {
    const metadata = await route.middleware({ req: { headers: new Headers() }, input: { projectId: "project-a" }, files: [validFile] });
    const providerFiles = metadata[UTFiles] as Array<{ customId?: string }>;
    expect(providerFiles).toEqual([{ ...validFile, customId: "intent-a" }]);
    expect(intentCreate).toHaveBeenCalledOnce();
    expect(Object.values(route.routerConfig).every((config) => config.acl === "private")).toBe(true);

    await expect(route.middleware({ req: { headers: new Headers() }, input: { projectId: "project-a" }, files: [validFile, validFile] })).rejects.toThrow();
  });

  it("creates callback metadata from verified provider data and cleans up when persistence fails", async () => {
    await expect(route.onUploadComplete({ file: { ...validFile, key: "provider-key", customId: "intent-a" }, metadata: { intentId: "intent-a" } })).resolves.toEqual({ fileId: "file-a", filename: "brief.pdf", size: 20, type: "application/pdf" });
    expect(fileCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ key: "provider-key", projectId: "project-a", uploadedByUserId: "user-a" }) }));

    transaction.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(route.onUploadComplete({ file: { ...validFile, key: "provider-key-2", customId: "intent-a" }, metadata: { intentId: "intent-a" } })).rejects.toThrow("database unavailable");
    expect(deleteByKey).toHaveBeenCalledWith("provider-key-2");
  });

  it("treats duplicate provider completions as idempotent", async () => {
    transaction.mockImplementationOnce((callback) => callback({
      fileUploadIntent: {
        findUnique: vi.fn().mockResolvedValue({ id: "intent-a", projectId: "project-a", userId: "user-a", providerKey: "provider-key", status: "ATTACHED", expiresAt: new Date(Date.now() - 60_000) }),
      },
      file: { create: fileCreate, findUnique: fileFind },
    }));
    fileFind.mockResolvedValueOnce({ id: "file-a", filename: "brief.pdf", size: 20, mimeType: "application/pdf" });
    await expect(route.onUploadComplete({ file: { ...validFile, key: "provider-key", customId: "intent-a" }, metadata: { intentId: "intent-a" } })).resolves.toMatchObject({ fileId: "file-a" });
    expect(fileCreate).not.toHaveBeenCalled();
  });
});
