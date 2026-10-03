import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { fixtureIds, seedIntegrationFixtures } from "./fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal", async (importOriginal) => {
  const portal = await importOriginal<typeof import("@/lib/portal")>();
  return {
    ...portal,
    getClientPortalSession: vi.fn().mockResolvedValue(null),
  };
});

const email = "itest_atomic_failure@example.test";
const token = "itest_atomic_failure_token";
const invitationId = "itest_atomic_failure_invite";
const raceEmail = "itest_atomic_race@example.test";
const raceToken = "itest_atomic_race_token";
const raceInvitationId = "itest_atomic_race_invite";

beforeAll(async () => {
  await seedIntegrationFixtures(db);
  await db.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION itest_reject_client_session() RETURNS trigger AS $$
    BEGIN
      IF NEW.email = '${email}' THEN
        RAISE EXCEPTION 'forced invitation acceptance failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS itest_reject_client_session_trigger ON client_sessions
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER itest_reject_client_session_trigger
    BEFORE INSERT ON client_sessions
    FOR EACH ROW EXECUTE FUNCTION itest_reject_client_session()
  `);
  await db.clientInvitation.upsert({
    where: { id: invitationId },
    update: {
      token,
      acceptedAt: null,
      expiresAt: new Date("2099-12-31"),
    },
    create: {
      id: invitationId,
      projectId: fixtureIds.projectA,
      email,
      token,
      expiresAt: new Date("2099-12-31"),
    },
  });
  await db.clientInvitation.upsert({
    where: { id: raceInvitationId },
    update: {
      token: raceToken,
      acceptedAt: null,
      expiresAt: new Date("2099-12-31"),
    },
    create: {
      id: raceInvitationId,
      projectId: fixtureIds.projectA,
      email: raceEmail,
      token: raceToken,
      expiresAt: new Date("2099-12-31"),
    },
  });
});

afterAll(async () => {
  await db.$executeRawUnsafe(
    "DROP TRIGGER IF EXISTS itest_reject_client_session_trigger ON client_sessions",
  );
  await db.$executeRawUnsafe(
    "DROP FUNCTION IF EXISTS itest_reject_client_session()",
  );
  await db.clientSession.deleteMany({ where: { email } });
  await db.projectAccess.deleteMany({
    where: { projectId: fixtureIds.projectA, email },
  });
  await db.clientInvitation.deleteMany({ where: { id: invitationId } });
  await db.clientSession.deleteMany({ where: { email: raceEmail } });
  await db.projectAccess.deleteMany({
    where: { projectId: fixtureIds.projectA, email: raceEmail },
  });
  await db.clientInvitation.deleteMany({ where: { id: raceInvitationId } });
});

describe("atomic client invitation acceptance", () => {
  it("rolls back the claim and project access if session creation fails", async () => {
    const { POST } = await import("@/app/api/portal/accept/route");
    const request = new NextRequest("http://localhost:3000/api/portal/accept", {
      method: "POST",
      body: new URLSearchParams({ token }),
    });

    await expect(POST(request)).rejects.toBeDefined();

    const invitation = await db.clientInvitation.findUnique({
      where: { id: invitationId },
      select: { acceptedAt: true },
    });
    const access = await db.projectAccess.findUnique({
      where: { projectId_email: { projectId: fixtureIds.projectA, email } },
    });
    const sessionCount = await db.clientSession.count({ where: { email } });

    expect(invitation?.acceptedAt).toBeNull();
    expect(access).toBeNull();
    expect(sessionCount).toBe(0);
  });

  it("allows only one concurrent request to claim a client invitation", async () => {
    const { POST } = await import("@/app/api/portal/accept/route");
    const makeRequest = () =>
      new NextRequest("http://localhost:3000/api/portal/accept", {
        method: "POST",
        body: new URLSearchParams({ token: raceToken }),
      });

    const responses = await Promise.all([POST(makeRequest()), POST(makeRequest())]);
    expect(responses.map((response) => response.status).sort()).toEqual([303, 307]);

    const [invitation, access, sessionCount] = await Promise.all([
      db.clientInvitation.findUnique({
        where: { id: raceInvitationId },
        select: { acceptedAt: true },
      }),
      db.projectAccess.findUnique({
        where: { projectId_email: { projectId: fixtureIds.projectA, email: raceEmail } },
      }),
      db.clientSession.count({ where: { email: raceEmail } }),
    ]);
    expect(invitation?.acceptedAt).not.toBeNull();
    expect(access).not.toBeNull();
    expect(sessionCount).toBe(1);
  });
});
