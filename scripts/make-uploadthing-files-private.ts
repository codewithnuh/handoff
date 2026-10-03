import "dotenv/config";
import { fileStorage } from "../lib/files/storage";

const pageSize = 500;
let offset = 0;
let total = 0;

for (;;) {
  const page = await fileStorage.listFiles(offset, pageSize);
  if (page.files.length === 0) break;

  const keys = page.files.map((file) => file.key);
  const result = await fileStorage.makePrivate(keys);
  if (!result.success) throw new Error(`UploadThing did not privatize provider page at offset ${offset}.`);

  total += keys.length;
  offset += page.files.length;
  console.log(`Marked ${total} provider objects private.`);
  if (!page.hasMore) break;
}

console.log(`Completed provider ACL migration for ${total} objects.`);
