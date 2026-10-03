import type { Prisma } from "@/app/generated/prisma/client";

/** Atomically consumes an upload intent for one version in its original project. */
export async function claimFileForVersion(
  tx: Pick<Prisma.TransactionClient, "file" | "fileUploadIntent">,
  input: { fileId: string; projectId: string; userId: string },
) {
  const file = await tx.file.findFirst({
    where: {
      id: input.fileId,
      projectId: input.projectId,
      uploadedByUserId: input.userId,
      attachedAt: null,
      uploadIntentId: { not: null },
    },
    select: { id: true, uploadIntentId: true },
  });
  if (!file?.uploadIntentId) {
    throw new Error("This file is unavailable or has already been attached.");
  }

  const claimed = await tx.fileUploadIntent.updateMany({
    where: {
      id: file.uploadIntentId,
      projectId: input.projectId,
      userId: input.userId,
      status: "COMPLETE",
      expiresAt: { gt: new Date() },
    },
    data: { status: "ATTACHED" },
  });
  if (claimed.count !== 1) {
    throw new Error("This upload is expired or has already been attached.");
  }

  const attached = await tx.file.updateMany({
    where: { id: file.id, attachedAt: null, projectId: input.projectId },
    data: { attachedAt: new Date() },
  });
  if (attached.count !== 1) throw new Error("This file has already been attached.");

  return file.id;
}
