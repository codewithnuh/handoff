import "dotenv/config";
import "server-only";
import {
  describeEnvironmentErrors,
  parsePublicEnvironment,
  parseServerEnvironment,
} from "@/lib/config/env-schema";

const serverResult = parseServerEnvironment(process.env);
if (!serverResult.success) {
  throw new Error(
    describeEnvironmentErrors("server", serverResult.error),
  );
}

const publicResult = parsePublicEnvironment(process.env);
if (!publicResult.success) {
  throw new Error(
    describeEnvironmentErrors("public", publicResult.error),
  );
}

export const env = {
  ...serverResult.data,
  ...publicResult.data,
};
