import type { PrismaClient } from "@/app/generated/prisma/client";

type StorageCleanup = {
  deleteByKey(key: string): Promise<{ success: boolean }>;
  deleteByCustomId(customId: string): Promise<{ success: boolean }>;
};

/** Claims the intent before deleting provider data, so attachment and cleanup cannot both win. */
export async function cleanupAbandonedUpload(
  db: Pick<PrismaClient, "$transaction">,
  storage: StorageCleanup,
  file: { id: string; key: string; uploadIntentId: string | null },
  now = new Date(),
) {
  const uploadIntentId = file.uploadIntentId;
  if (!uploadIntentId) return false;

  const claimed = await db.$transaction(async (tx) => {
    const eligible = await tx.file.findFirst({
      where: { id: file.id, attachedAt: null, versions: { none: {} } },
      select: { uploadIntentId: true },
    });
    if (!eligible?.uploadIntentId) return false;
    const transitioned = await tx.fileUploadIntent.updateMany({
      where: { id: uploadIntentId, status: "COMPLETE", expiresAt: { lte: now } },
      data: { status: "CLEANUP_PENDING" },
    });
    return transitioned.count === 1;
  });
  if (!claimed) return false;

  const keyResult = await storage.deleteByKey(file.key);
  if (!keyResult.success) throw new Error("Provider key deletion failed.");
  const customIdResult = await storage.deleteByCustomId(uploadIntentId);
  if (!customIdResult.success) throw new Error("Provider custom ID deletion failed.");

  await db.$transaction(async (tx) => {
    await tx.file.deleteMany({
      where: { id: file.id, attachedAt: null, versions: { none: {} } },
    });
    await tx.fileUploadIntent.updateMany({
      where: { id: uploadIntentId, status: "CLEANUP_PENDING" },
      data: { status: "CLEANED" },
    });
  });

  return true;
}
