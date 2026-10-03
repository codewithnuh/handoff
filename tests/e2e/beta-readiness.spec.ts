import { expect, test } from "@playwright/test";

test("health endpoints separate process liveness from database readiness", async ({ request }) => {
  const live = await request.get("/api/health/live");
  expect(live.status()).toBe(200);
  expect(await live.json()).toEqual({ status: "alive" });
  expect(live.headers()["cache-control"]).toBe("no-store");

  const ready = await request.get("/api/health/ready");
  expect(ready.status()).toBe(200);
  expect(await ready.json()).toEqual({ status: "ready" });
  expect(ready.headers()["cache-control"]).toBe("no-store");
});
