import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { listClients } from "@/lib/actions/client";
import { setSubjectAdapters } from "@/lib/access";
import { fixtureIds, seedIntegrationFixtures } from "./fixtures";

let ownerA: Awaited<ReturnType<typeof db.user.findUniqueOrThrow>>;
let restoreSubject: (() => void) | undefined;

beforeAll(async () => {
  const fixtures = await seedIntegrationFixtures(db);
  ownerA = fixtures.ownerA;
});

afterAll(() => restoreSubject?.());

describe("PostgreSQL integration safety", () => {
  it("enforces foreign keys and workspace-scoped unique constraints", async () => {
    await expect(
      db.client.create({
        data: {
          workspaceId: "itest_missing_workspace",
          name: "Invalid client",
          email: "invalid@example.test",
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });

    await expect(
      db.client.create({
        data: {
          workspaceId: fixtureIds.workspaceA,
          name: "Duplicate client",
          email: "shared@example.test",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    const sharedEmailCount = await db.client.count({
      where: { email: "shared@example.test" },
    });
    expect(sharedEmailCount).toBe(2);
  });

  it("rolls back writes and confirms no row persisted", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await tx.client.create({
          data: {
            workspaceId: fixtureIds.workspaceA,
            name: "Rolled back client",
            email: "rollback@example.test",
          },
        });
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");

    const rolledBack = await db.client.findFirst({
      where: { workspaceId: fixtureIds.workspaceA, email: "rollback@example.test" },
    });
    expect(rolledBack).toBeNull();
  });

  it("runs a client action against persisted PostgreSQL rows", async () => {
    restoreSubject = setSubjectAdapters({
      getUser: async () => ownerA,
      getClient: async () => null,
    });

    const result = await listClients();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items.map((client) => client.id)).toContain(
        fixtureIds.clientA,
      );
    }
  });
});
