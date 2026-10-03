import { UTApi } from "uploadthing/server";

const api = new UTApi();

/** The only provider seam used by application flows and maintenance scripts. */
export const fileStorage = {
  generateSignedURL(key: string, expiresIn: number) {
    return api.generateSignedURL(key, { expiresIn });
  },
  deleteByKey(key: string) {
    return api.deleteFiles(key, { keyType: "fileKey" });
  },
  deleteByCustomId(customId: string) {
    return api.deleteFiles(customId, { keyType: "customId" });
  },
  listFiles(offset: number, limit: number) {
    return api.listFiles({ offset, limit });
  },
  makePrivate(keys: string[]) {
    return api.updateACL(keys, "private");
  },
};

export const PRIVATE_DOWNLOAD_TTL_SECONDS = 60;
