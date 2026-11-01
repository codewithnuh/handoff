// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const run = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/auth", () => ({
  sendVerificationOtp: vi.fn(),
  verifyEmailOtp: vi.fn(),
}));

vi.mock("@/hooks/use-server-action", () => ({
  useServerAction: () => ({ pending: false, run }),
}));

import VerifyEmailForm from "@/components/auth/verify-email-form";

beforeAll(() => {
  // input-otp probes ResizeObserver and elementFromPoint for its password
  // manager hint; neither exists in jsdom.
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }

  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => null,
  });
});

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  run.mockClear();
});

function getOtpInput() {
  return screen.getByLabelText("Verification code") as HTMLInputElement;
}

function renderForm() {
  render(<VerifyEmailForm email="ada@example.com" />);
  return getOtpInput();
}

describe("VerifyEmailForm", () => {
  it("accepts a code one digit at a time", () => {
    const input = renderForm();

    for (const value of ["1", "12", "123", "1234", "12345", "123456"]) {
      fireEvent.change(input, { target: { value } });
      expect(input.value).toBe(value);
    }

    const slots = Array.from(
      document.querySelectorAll('[data-slot="input-otp-slot"]'),
      (slot) => slot.textContent,
    );
    expect(slots.join("")).toBe("123456");
    expect(run).toHaveBeenCalledWith("123456");
  });

  it("fills every slot when a spaced or dashed code is pasted", () => {
    const input = renderForm();

    fireEvent.paste(input, {
      clipboardData: { getData: () => "123 456" },
    });

    expect(input.value).toBe("123456");
    expect(run).toHaveBeenCalledWith("123456");
  });

  it("ignores pasted text that contains no digits", () => {
    const input = renderForm();

    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.paste(input, {
      clipboardData: { getData: () => "not a code" },
    });

    expect(input.value).toBe("12");
  });
});
