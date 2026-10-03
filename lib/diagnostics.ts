/** Return a log-safe error label without including the message, stack, or config. */
export function safeErrorName(error: unknown): string {
  if (
    error instanceof Error &&
    /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(error.name)
  ) {
    return error.name;
  }
  return "UnknownError";
}
