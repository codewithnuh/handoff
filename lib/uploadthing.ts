import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

/**
 * Uploadthing file router.
 *
 * "deliverableFile" — handles file uploads for deliverable versions.
 * Accepts any file type up to 32 MB.
 */
export const ourFileRouter = {
  deliverableFile: f({
    "image/*": { maxFileSize: "16MB" },
    "application/pdf": { maxFileSize: "32MB" },
    "text/*": { maxFileSize: "8MB" },
    "application/zip": { maxFileSize: "32MB" },
    "application/x-zip-compressed": { maxFileSize: "32MB" },
    "application/msword": { maxFileSize: "16MB" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
    },
    "application/vnd.ms-excel": { maxFileSize: "16MB" },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "16MB",
    },
    "application/vnd.ms-powerpoint": { maxFileSize: "16MB" },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
      maxFileSize: "16MB",
    },
    "application/postscript": { maxFileSize: "16MB" },
    "application/illustrator": { maxFileSize: "16MB" },
  })
    .middleware(async () => {
      // In production, verify auth here:
      // const session = await getSession();
      // if (!session) throw new UnauthorizedError();
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      return {
        url: file.url,
        name: file.name,
        size: file.size,
        type: file.type,
        key: file.key,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
