import { Prisma } from "@/app/generated/prisma/client";
import type { ActivityType } from "@/app/generated/prisma/client";

type RecordActivityInput = {
  projectId: string;
  type: ActivityType;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  meta?: Prisma.InputJsonValue;
};

type ActivityActor = {
  id: string;
  email: string;
  name?: string | null;
};

export const actorOf = (user: ActivityActor) => ({
  actorUserId: user.id,
  actorEmail: user.email,
  actorName: user.name ?? null,
});

type ActivityWriter = Pick<Prisma.TransactionClient, "activity">;

/**
 * Writes an activity row through the caller's transaction when the event is
 * part of a business mutation. Errors deliberately propagate so the
 * transaction rolls back instead of returning a false failure after commit.
 */
export const recordActivity = async (
  input: RecordActivityInput,
  writer: ActivityWriter,
) => writer.activity.create({ data: input });
