import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/lib/uploadthing";
import { env } from "@/env";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: { token: env.UPLOADTHING_TOKEN },
});
