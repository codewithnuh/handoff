import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidateDashboard } from "@/lib/actions/revalidate";
import { revalidatePath } from "next/cache";

describe("revalidateDashboard", () => {
  it("calls revalidatePath for all dashboard routes", () => {
    revalidateDashboard();

    expect(revalidatePath).toHaveBeenCalledTimes(7);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/projects", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/projects/[slug]", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/clients", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/team", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/portal", "layout");
  });

  it("does not throw when revalidatePath throws", () => {
    vi.mocked(revalidatePath).mockImplementation(() => {
      throw new Error("revalidation failed");
    });

    expect(() => revalidateDashboard()).not.toThrow();
  });
});
