import type { ActionError, ActionSuccess } from "@/lib/types/action";
import type { ErrorCode } from "@/lib/constants/errors";

export class ActionResponse {
  static success<T>(data: T, message: string): ActionSuccess<T> {
    return {
      success: true,
      message,
      data,
    };
  }
  static failure(
    code: ErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ): ActionError {
    return {
      success: false,
      message,
      error: {
        code,
        ...(fieldErrors && { fieldErrors }),
      },
    };
  }
}
