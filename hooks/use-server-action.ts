import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { toast } from "@/components/ui/toast";
import type { ActionError, ActionResponseType } from "@/lib/types/action";
import { ActionTimeoutError, withTimeout } from "@/lib/utils/with-timeout";

/** How long a server action may run before the UI gives up waiting. */
export const ACTION_TIMEOUT_MS = 15_000;

export type ServerActionOptions<S> = {
  /**
   * Success toast title — static, or built from the result. A falsy title
   * suppresses the toast; omit `success` entirely to stay silent.
   */
  success?: string | ((data: S, message: string) => string);
  /** Optional second line on the success toast, built from the action's data. */
  successDescription?: (data: S, message: string) => string;
  /**
   * Failure toast title — shown when the action returns an error envelope.
   * A function may derive it from the envelope, or return false to suppress
   * the toast for that envelope (the `onError` side effect still runs).
   */
  failure?: string | ((error: ActionError["error"], message: string) => string | false);
  /** Second line on the failure toast. Defaults to the envelope's message. */
  failureDescription?: (error: ActionError["error"], message: string) => string;
  /**
   * Title shown when the action throws (timeout, network, bug). A function
   * may derive it, or return false to suppress the toast.
   */
  thrown?: string | ((error: unknown) => string | false);
  /** Second line on the thrown toast. Defaults to the error's message. */
  thrownDescription?: (error: unknown) => string;
  /** Refresh the current route after a success. Defaults to true. */
  refresh?: boolean;
  /** Milliseconds before the call is abandoned. Defaults to ACTION_TIMEOUT_MS. */
  timeout?: number;
  /** Undo optimistic UI after a failure or a throw. */
  rollback?: () => void;
  /** Runs after the success toast, with the action's data. */
  onSuccess?: (data: S) => void;
  /** Runs after the failure toast, with the action's error. */
  onError?: (error: ActionError["error"]) => void;
  /** Runs after the thrown-error toast. */
  onThrown?: (error: unknown) => void;
};

export type ServerActionRun<I, S> = (
  input?: I,
) => Promise<ActionResponseType<S> | null>;

/**
 * The pending / toast / refresh / timeout block that every mutating component
 * used to hand-roll: one interface, so an error path written once covers every
 * call site, and the whole block is reachable by a single test.
 *
 *   const { pending, run } = useServerAction(deleteClient, {
 *     success: "Client deleted",
 *     failure: "Couldn't delete client",
 *     onSuccess: () => setDeleteTarget(null),
 *   });
 *
 * `run` resolves with the action's envelope, or `null` when the call threw.
 */
export function useServerAction<I, S>(
  action: (input: I) => Promise<ActionResponseType<S>>,
  options: ServerActionOptions<S> = {},
): { pending: boolean; run: ServerActionRun<I, S> } {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const {
    success,
    successDescription,
    failure,
    failureDescription,
    thrown = (error: unknown) =>
      error instanceof ActionTimeoutError
        ? "Result not confirmed"
        : "Couldn't confirm the result",
    thrownDescription,
    refresh = true,
    timeout = ACTION_TIMEOUT_MS,
    rollback,
    onSuccess,
    onError,
    onThrown,
  } = options;

  const run = useCallback<ServerActionRun<I, S>>(
    async (input) => {
      setPending(true);
      try {
        const result = await withTimeout(
          Promise.resolve(action(input as I)),
          timeout,
        );

        if (result.success) {
          const title =
            typeof success === "function"
              ? success(result.data, result.message)
              : success;
          if (title) {
            const description = successDescription?.(result.data, result.message);
            toast.add({
              type: "success",
              title,
              ...(description ? { description } : {}),
            });
          }
          if (refresh) router.refresh();
          onSuccess?.(result.data);
        } else {
          const title =
            typeof failure === "function"
              ? failure(result.error, result.message)
              : failure;
          if (title) {
            const description = failureDescription
              ? failureDescription(result.error, result.message)
              : result.message;
            toast.add({
              type: "error",
              title,
              ...(description ? { description } : {}),
            });
          }
          rollback?.();
          onError?.(result.error);
        }

        return result;
      } catch (error) {
        const title = typeof thrown === "function" ? thrown(error) : thrown;
        if (title) {
          const description = thrownDescription
            ? thrownDescription(error)
            : error instanceof ActionTimeoutError
              ? "The action may have completed. Refresh before retrying."
              : "The action may have completed. Refresh before retrying.";
          toast.add({
            type: "error",
            title,
            ...(description ? { description } : {}),
          });
        }
        // A rejected network request or UI timeout does not cancel the server
        // action. Keep optimistic state until the refreshed server state lands.
        if (refresh) router.refresh();
        onThrown?.(error);
        return null;
      } finally {
        setPending(false);
      }
    },
    [
      action,
      success,
      successDescription,
      failure,
      failureDescription,
      thrown,
      thrownDescription,
      refresh,
      timeout,
      rollback,
      onSuccess,
      onError,
      onThrown,
      router,
    ],
  );

  return { pending, run };
}
