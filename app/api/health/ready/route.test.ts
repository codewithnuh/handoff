import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/prisma";
import { GET } from "./route";

vi.mock("@/lib/prisma", async () => ({
  db: (await import("@/lib/test/fake-db")).fakeDb,
}));

const query = vi.mocked(db.$queryRaw);

beforeEach(() => vi.clearAllMocks());

describe("readiness endpoint", () => {
  it("reports ready when PostgreSQL answers", async () => {
    query.mockResolvedValue([] as never);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
  });

  it("returns a sanitized 503 response when PostgreSQL is unavailable", async () => {
    const failure = new Error("postgres://user:secret@db.internal/app");
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    query.mockRejectedValue(failure);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toBe('{"status":"not_ready"}');
    expect(body).not.toContain("secret");
    expect(errorLog).toHaveBeenCalledWith("Readiness check failed", { errorName: "Error" });
    errorLog.mockRestore();
  });
});
