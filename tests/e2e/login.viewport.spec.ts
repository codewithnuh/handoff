import { expect, test } from "@playwright/test";

test("mobile sign-in form remains keyboard reachable and labelled", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

  const email = page.getByLabel("Email");
  const password = page.locator("input#password");
  await email.focus();
  await expect(email).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();

  const viewport = page.viewportSize();
  expect(viewport?.width).toBeLessThanOrEqual(430);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
