export class ActionTimeoutError extends Error {
  constructor(message = "The result could not be confirmed before the timeout.") {
    super(message);
    this.name = "ActionTimeoutError";
  }
}

/**
 * Runs an async server action behind a timeout guard so the UI can respond
 * (instead of spinning forever) when the action hangs or the network stalls.
 *
 * The underlying promise keeps running in the background; we simply stop
 * waiting and surface a `ActionTimeoutError` to the caller.
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage?: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ActionTimeoutError(timeoutMessage));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
};
