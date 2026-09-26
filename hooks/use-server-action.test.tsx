// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/toast", () => ({
  toast: { add: vi.fn() },
}));

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { toast } from "@/components/ui/toast";
import type { ActionResponseType } from "@/lib/types/action";
import { useServerAction } from "@/hooks/use-server-action";

const toastAdd = vi.mocked(toast.add);

const ok: ActionResponseType<{ id: string }> = {
  success: true,
  message: "Saved",
  data: { id: "1" },
};

const fail: ActionResponseType<{ id: string }> = {
  success: false,
  message: "Not allowed",
  error: { code: "FORBIDDEN" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useServerAction", () => {
  it("toasts success, refreshes and exposes the data", async () => {
    const action = vi.fn().mockResolvedValue(ok);
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useServerAction(action, {
        success: "Client deleted",
        successDescription: (data) => `${data.id} is gone`,
        onSuccess,
      }),
    );

    await act(async () => {
      await result.current.run({ id: "1" } as never);
    });

    expect(toastAdd).toHaveBeenCalledWith({
      type: "success",
      title: "Client deleted",
      description: "1 is gone",
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith({ id: "1" });
    expect(result.current.pending).toBe(false);
  });

  it("skips the toast and the refresh when configured to", async () => {
    const action = vi.fn().mockResolvedValue(ok);
    const { result } = renderHook(() =>
      useServerAction(action, { refresh: false }),
    );

    await act(async () => {
      await result.current.run();
    });

    expect(toastAdd).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("toasts the failure envelope without refreshing", async () => {
    const action = vi.fn().mockResolvedValue(fail);
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useServerAction(action, {
        failure: "Couldn't delete client",
        onError,
      }),
    );

    let returned: ActionResponseType<unknown> | null = null;
    await act(async () => {
      returned = await result.current.run();
    });

    expect(toastAdd).toHaveBeenCalledWith({
      type: "error",
      title: "Couldn't delete client",
      description: "Not allowed",
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({ code: "FORBIDDEN" });
    expect(returned).toEqual(fail);
    expect(result.current.pending).toBe(false);
  });

  it("swallows a throw into a toast and resolves null", async () => {
    const action = vi.fn().mockRejectedValue(new Error("Network down"));
    const onThrown = vi.fn();
    const rollback = vi.fn();

    const { result } = renderHook(() =>
      useServerAction(action, {
        failure: "Nope",
        rollback,
        onThrown,
      }),
    );

    let returned: unknown = "unset";
    await act(async () => {
      returned = await result.current.run();
    });

    expect(toastAdd).toHaveBeenCalledWith({
      type: "error",
      title: "Something went wrong",
      description: "Network down",
    });
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(onThrown).toHaveBeenCalledWith(expect.any(Error));
    expect(returned).toBeNull();
  });

  it("derives titles from the result and suppresses when told to", async () => {
    const okAction = vi.fn().mockResolvedValue({
      success: true,
      message: "Welcome to Acme!",
      data: {},
    } satisfies ActionResponseType<unknown>);
    const { result: okResult } = renderHook(() =>
      useServerAction(okAction, { success: (_data, message) => message }),
    );

    await act(async () => {
      await okResult.current.run();
    });

    expect(toastAdd).toHaveBeenCalledWith({
      type: "success",
      title: "Welcome to Acme!",
    });

    toastAdd.mockClear();

    const conflict: ActionResponseType<unknown> = {
      success: false,
      message: "Already revoked",
      error: { code: "CONFLICT" },
    };
    const onError = vi.fn();
    const failAction = vi.fn().mockResolvedValue(conflict);
    const { result: failResult } = renderHook(() =>
      useServerAction(failAction, {
        failure: (error) => (error.code === "CONFLICT" ? false : "Couldn't revoke"),
        onError,
      }),
    );

    await act(async () => {
      await failResult.current.run();
    });

    expect(toastAdd).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({ code: "CONFLICT" });
  });

  it("builds the thrown toast from the error when asked", async () => {
    vi.useFakeTimers();
    const action = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() =>
      useServerAction(action, {
        thrown: (error) =>
          error instanceof Error && error.message === "This action took too long and was cancelled."
            ? "Request timed out"
            : "Something went wrong",
        thrownDescription: () => "",
      }),
    );

    let returned: unknown = "unset";
    await act(async () => {
      const call = result.current.run();
      await vi.advanceTimersByTimeAsync(15_000);
      returned = await call;
    });

    expect(toastAdd).toHaveBeenCalledWith({
      type: "error",
      title: "Request timed out",
    });
    expect(returned).toBeNull();
  });

  it("overrides the failure description and rolls back on an error envelope", async () => {
    const action = vi.fn().mockResolvedValue(fail);
    const rollback = vi.fn();

    const { result } = renderHook(() =>
      useServerAction(action, {
        failure: "Couldn't revoke",
        failureDescription: () => "",
        rollback,
      }),
    );

    await act(async () => {
      await result.current.run();
    });

    expect(toastAdd).toHaveBeenCalledWith({
      type: "error",
      title: "Couldn't revoke",
    });
    expect(rollback).toHaveBeenCalledTimes(1);
  });

  it("reports pending while the action is in flight", async () => {
    let resolve: (value: ActionResponseType<{ id: string }>) => void = () => {};
    const action = vi.fn().mockReturnValue(
      new Promise<ActionResponseType<{ id: string }>>((r) => {
        resolve = r;
      }),
    );

    const { result } = renderHook(() => useServerAction(action));

    let call: Promise<ActionResponseType<unknown> | null> | null = null;
    act(() => {
      call = result.current.run();
    });

    expect(result.current.pending).toBe(true);

    await act(async () => {
      resolve(ok);
      await call;
    });

    expect(result.current.pending).toBe(false);
  });

  it("abandons a hanging action after the timeout", async () => {
    vi.useFakeTimers();
    const action = vi.fn().mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useServerAction(action, { failure: "Nope" }));

    let returned: unknown = "unset";
    await act(async () => {
      const call = result.current.run();
      await vi.advanceTimersByTimeAsync(15_000);
      returned = await call;
    });

    expect(toastAdd).toHaveBeenCalledWith({
      type: "error",
      title: "Something went wrong",
      description: "This action took too long and was cancelled.",
    });
    expect(returned).toBeNull();
    expect(result.current.pending).toBe(false);
  });
});
