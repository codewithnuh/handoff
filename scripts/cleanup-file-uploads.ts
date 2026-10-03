import "dotenv/config";
import { db } from "../lib/prisma";
import { fileStorage } from "../lib/files/storage";
import { cleanupAbandonedUpload } from "../lib/files/cleanup";

const now = new Date();
const expired = await db.fileUploadIntent.findMany({
  where: {
    status: { in: ["PENDING", "CLEANUP_PENDING"] },
    expiresAt: { lte: now },
  },
  select: { id: true, providerKey: true },
  take: 200,
});

for (const intent of expired) {
  try {
    await db.fileUploadIntent.updateMany({
      where: { id: intent.id, status: "PENDING" },
      data: { status: "CLEANUP_PENDING" },
    });
    if (intent.providerKey) {
      const result = await fileStorage.deleteByKey(intent.providerKey);
      if (!result.success) throw new Error("Provider key deletion failed.");
    }
    const result = await fileStorage.deleteByCustomId(intent.id);
    if (!result.success) throw new Error("Provider custom ID deletion failed.");
    await db.$transaction(async (tx) => {
      await tx.file.deleteMany({
        where: { uploadIntentId: intent.id, attachedAt: null, versions: { none: {} } },
      });
      await tx.fileUploadIntent.updateMany({
        where: { id: intent.id, status: "CLEANUP_PENDING" },
        data: { status: "CLEANED" },
      });
    });
  } catch (error) {
    console.error(`Failed to clean expired upload intent ${intent.id}:`, error);
  }
}

// Completed uploads that the user never attached are retained for one day,
// then removed from provider storage and the database.
const abandoned = await db.file.findMany({
  where: {
    attachedAt: null,
    createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    versions: { none: {} },
    uploadIntent: { status: "COMPLETE" },
  },
  select: { id: true, key: true, uploadIntentId: true },
  take: 200,
});

for (const file of abandoned) {
  try {
    await cleanupAbandonedUpload(db, fileStorage, file, now);
  } catch (error) {
    console.error(`Failed to clean abandoned file ${file.id}:`, error);
  }
}

console.log(`Processed ${expired.length} expired intents and ${abandoned.length} abandoned uploads.`);
await db.$disconnect();
