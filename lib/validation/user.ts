import { z } from "zod";

export const userSchema = z.object({
  name: z.string(),
  email: z.email(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});
export type createUserType = z.infer<typeof userSchema>;
