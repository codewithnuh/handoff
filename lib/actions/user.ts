"use server";
import { createUserType, userSchema } from "@/lib/validation/user";
import { ActionResponse } from "../utils/action-response";
import { ERROR_CODES } from "../constants/errors";
import { db } from "../prisma";
import bcrypt from "bcrypt";

export const createUser = async (
  data: createUserType,
): Promise<ActionResponse> => {
  const validatedData = userSchema.safeParse(data);
  if (validatedData.error) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      validatedData.error.message,
    );
  }
  const isUserExists = await db.user.findFirst({
    where: { email: validatedData.data.email },
  });
  if (isUserExists) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "User already exists",
    );
  }
  const passwordHash = await bcrypt.hash(validatedData.data.password, 10);
  await db.user.create({
    data: {
      name: validatedData.data.name,
      email: validatedData.data.email,
      passwordHash: passwordHash,
    },
  });
  return ActionResponse.success(validatedData.data, "User created");
};
