import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("liveness endpoint", () => {
  it("reports process liveness without checking dependencies", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "alive" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
