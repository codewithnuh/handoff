import { Prisma } from "@/app/generated/prisma/client";
import type { ActivityType } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";

type RecordActivityInput = {
  projectId: string;
  type: ActivityType;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  meta?: Prisma.InputJsonValue;
};

/**
 * Inserts a row into the activity timeline. Failures are logged but never
 * allowed to break the primary mutation — the user's action already succeeded.
 */
export const recordActivity = async (input: RecordActivityInput) => {
  try {
    await db.activity.create({ data: input });
  } catch (error) {
    console.error("Failed to record activity:", error);
  }
};
