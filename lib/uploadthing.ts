import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTFiles, UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { authorizeProjectUpload } from "@/lib/files/upload-authorization";
import {
  isUploadMetadataValid,
  MAX_UPLOAD_INTENT_AGE_MS,
  validateUploadMetadata,
} from "@/lib/files/validation";
import { fileStorage } from "@/lib/files/storage";

const f = createUploadthing();

export const ourFileRouter = {
  deliverableFile: f(
    {
      image: { maxFileSize: "16MB", maxFileCount: 1, acl: "private" },
      "application/pdf": { maxFileSize: "32MB", maxFileCount: 1, acl: "private" },
      text: { maxFileSize: "8MB", maxFileCount: 1, acl: "private" },
      "application/zip": { maxFileSize: "32MB", maxFileCount: 1, acl: "private" },
      "application/msword": { maxFileSize: "16MB", maxFileCount: 1, acl: "private" },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        maxFileSize: "16MB",
        maxFileCount: 1,
        acl: "private",
      },
      "application/vnd.ms-excel": { maxFileSize: "16MB", maxFileCount: 1, acl: "private" },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        maxFileSize: "16MB",
        maxFileCount: 1,
        acl: "private",
      },
      "application/vnd.ms-powerpoint": { maxFileSize: "16MB", maxFileCount: 1, acl: "private" },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
        maxFileSize: "16MB",
        maxFileCount: 1,
        acl: "private",
      },
      "application/postscript": { maxFileSize: "16MB", maxFileCount: 1, acl: "private" },
    },
  )
    .input(z.object({
      projectId: z.string().trim().min(1).max(100),
      deliverableId: z.string().trim().min(1).max(100).optional(),
    }))
    .middleware(async ({ req, input, files }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session?.user) throw new UploadThingError("You must be signed in to upload.");
      if (files.length !== 1 || !isUploadMetadataValid(files[0])) {
        throw new UploadThingError("Upload exactly one supported file within its size limit.");
      }

      const owner = await authorizeProjectUpload(session.user.id, input.projectId, input.deliverableId);
      const intent = await db.fileUploadIntent.create({
        data: {
          projectId: owner.projectId,
          userId: owner.userId,
          expiresAt: new Date(Date.now() + MAX_UPLOAD_INTENT_AGE_MS),
        },
      });

      return {
        ...owner,
        intentId: intent.id,
        [UTFiles]: files.map((file) => ({ ...file, customId: intent.id })),
      };
    })
    .onUploadError(async ({ fileKey }) => {
      await fileStorage.deleteByKey(fileKey).catch(() => undefined);
    })
    .onUploadComplete(async ({ file, metadata }) => {
      if (file.customId !== metadata.intentId) {
        await fileStorage.deleteByKey(file.key).catch(() => undefined);
        throw new UploadThingError("Upload intent does not match the stored file.");
      }

      try {
        const meta = validateUploadMetadata(file);
        const result = await db.$transaction(async (tx) => {
          const intent = await tx.fileUploadIntent.findUnique({
            where: { id: metadata.intentId },
            select: { id: true, projectId: true, userId: true, providerKey: true, status: true, expiresAt: true },
          });
          if (!intent) throw new UploadThingError("Upload intent does not exist.");
          if (intent.status === "COMPLETE" || intent.status === "ATTACHED") {
            if (intent.providerKey !== file.key) throw new UploadThingError("Upload completion replay does not match.");
            const existing = await tx.file.findUnique({ where: { uploadIntentId: intent.id } });
            if (!existing) throw new UploadThingError("Completed upload record is missing.");
            return existing;
          }
          if (intent.status !== "PENDING") throw new UploadThingError("Upload intent is not active.");
          if (intent.expiresAt <= new Date()) {
            throw new UploadThingError("Upload intent has expired.");
          }

          const created = await tx.file.create({
            data: {
              key: file.key,
              filename: meta.filename,
              mimeType: meta.mimeType,
              size: meta.size,
              projectId: intent.projectId,
              uploadedByUserId: intent.userId,
              uploadIntentId: intent.id,
            },
          });
          await tx.fileUploadIntent.update({
            where: { id: intent.id },
            data: { providerKey: file.key, status: "COMPLETE" },
          });
          return created;
        });

        return { fileId: result.id, filename: result.filename, size: result.size, type: result.mimeType };
      } catch (error) {
        // The pending intent remains available for the cleanup job if the DB
        // is unavailable or provider deletion fails.
        await fileStorage.deleteByKey(file.key).catch(async () => {
          await db.fileUploadIntent.updateMany({
            where: { id: metadata.intentId, status: "PENDING" },
            data: { providerKey: file.key, status: "CLEANUP_PENDING" },
          }).catch(() => undefined);
        });
        throw error;
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
