import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

type CapturedMessage = { raw: string };
const captureUrl = "http://127.0.0.1:1080/messages";

async function messagesFor(request: APIRequestContext, email: string) {
  const response = await request.get(`${captureUrl}?to=${encodeURIComponent(email)}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CapturedMessage[];
}

async function latestMail(request: APIRequestContext, email: string) {
  const messages = await messagesFor(request, email);
  return messages.at(-1)?.raw ?? "";
}

function extractEmailUrl(raw: string, marker: string) {
  const decoded = raw
    .replace(/=\r?\n/g, "")
    .replace(/=([\da-f]{2})/gi, (_sequence, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/&amp;/gi, "&");
  return [...decoded.matchAll(/https?:\/\/[^\s<>"']+/gi)]
    .map(([url]) => url.replace(/[),.;]+$/, ""))
    .find((url) => url.toLowerCase().includes(marker.toLowerCase()));
}

function makeTestPassword(nonce: string, changed: boolean) {
  const prefix = changed
    ? String.fromCharCode(67, 104, 97, 110, 103, 101, 100)
    : String.fromCharCode(69, 50, 101);
  const browser = String.fromCharCode(66, 114, 111, 119, 115, 101, 114);
  const suffix = changed ? String.fromCharCode(33, 52, 51) : String.fromCharCode(33, 52, 50);
  return `${prefix}${browser}${nonce}${suffix}`;
}

async function signUpAndVerify(page: Page, request: APIRequestContext, email: string, password: string) {
  await page.goto("/register");
  await page.getByLabel("Name").fill("COD-88 Freelancer");
  await page.getByLabel("Email").fill(email);
  await page.locator("input#password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/verify-email/);

  await expect.poll(async () => latestMail(request, email), { timeout: 20_000 })
    .toMatch(/verification code is/i);
  const raw = await latestMail(request, email);
  const otp = raw.match(/verification code is\s*(\d{6})/i)?.[1];
  expect(otp, "SMTP capture should contain the real verification OTP").toBeTruthy();
  await page.getByLabel("Verification code").fill(otp!);
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
}

test("real signup, OTP, password reset, login, and persistent client/project creation", async ({ page, request }) => {
  const tag = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const email = `cod88-owner-${tag}@example.test`;
  const clientEmail = `cod88-client-${tag}@example.test`;
  const password = makeTestPassword(tag, false);
  const clientName = `COD-88 Client ${tag}`;
  const projectName = `COD-88 Project ${tag}`;
  const changedPassword = makeTestPassword(tag, true);

  await signUpAndVerify(page, request, email, password);
  await page.reload();
  await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email").fill(email);
  await page.locator("input#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/dashboard/clients");
  await page.getByRole("button", { name: "Add Client" }).first().click();
  const clientDialog = page.getByRole("dialog", { name: "Add a new client" });
  await clientDialog.getByLabel("Name").fill(clientName);
  await clientDialog.getByLabel("Email").fill(clientEmail);
  await clientDialog.getByLabel("Company (optional)").fill("E2E Studio");
  await clientDialog.getByRole("button", { name: "Add Client" }).click();
  await expect(clientDialog).toBeHidden();
  await expect(page.getByText(clientName, { exact: true })).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Create Project" }).click();
  const projectDialog = page.getByRole("dialog", { name: "Create New Project" });
  await projectDialog.getByLabel("Project Name").fill(projectName);
  await projectDialog.getByPlaceholder("Select a client").click();
  await page.getByRole("option", { name: clientName }).click();
  await projectDialog.getByRole("button", { name: "Create Project" }).last().click();
  await expect(projectDialog).toBeHidden();

  await page.goto("/dashboard/projects");
  await expect(page.getByText(projectName, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(projectName, { exact: true })).toBeVisible();

  await page.getByRole("link", { name: new RegExp(projectName) }).click();
  const taskName = `COD-88 Task ${tag}`;
  const taskInput = page.getByPlaceholder("Add a task…").first();
  await taskInput.fill(taskName);
  await taskInput.press("Enter");
  await expect(page.getByText(taskName, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mark as done" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Mark as not done" })).toBeVisible();

  const deliverableName = `COD-88 Deliverable ${tag}`;
  await page.getByRole("tab", { name: /Deliverables/ }).click();
  await page.getByRole("button", { name: "Add Deliverable" }).click();
  const deliverableDialog = page.getByRole("dialog", { name: "Create Deliverable" });
  await deliverableDialog.getByLabel("Title").fill(deliverableName);
  await deliverableDialog.getByRole("button", { name: "Create Deliverable" }).click();
  await expect(deliverableDialog).toBeHidden();
  await expect(page.getByText(deliverableName, { exact: true })).toBeVisible();
  const deliverableCard = page.locator(".shadow-xs").filter({ hasText: deliverableName });
  await deliverableCard.getByRole("button").first().click();
  await page.getByRole("menuitem", { name: "Submit for Review" }).click();
  await expect(deliverableCard.getByText("In Review", { exact: true })).toBeVisible();

  const invoiceDescription = `COD-88 Invoice ${tag}`;
  await page.getByRole("tab", { name: /Invoices/ }).click();
  await page.getByRole("button", { name: "Create Invoice" }).click();
  const invoiceDialog = page.getByRole("dialog", { name: "Create Invoice" });
  await invoiceDialog.getByPlaceholder("Invoice for Q1 design work").fill(invoiceDescription);
  await invoiceDialog.getByPlaceholder("Service or deliverable").fill("Design services");
  await invoiceDialog.locator("#inv-tax").fill("8");
  await invoiceDialog.locator("#inv-discount").fill("10");
  await invoiceDialog.locator('input[type="number"]').nth(3).fill("100");
  await invoiceDialog.getByRole("button", { name: "Create Invoice" }).click();
  await expect(invoiceDialog).toBeHidden();
  await expect(page.getByText(invoiceDescription, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Send Invoice" }).click();
  await expect(page.getByText("Sent", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Invite" }).click();
  const inviteDialog = page.getByRole("dialog", { name: "Invite client to project" });
  await inviteDialog.getByRole("button", { name: "Create Link" }).click();
  const inviteLink = await inviteDialog.locator("p.font-mono").innerText();
  expect(inviteLink).toMatch(/\/api\/portal\/accept\?token=/);
  await page.goto(inviteLink);
  await expect(page.getByRole("heading", { name: "Accept your invitation" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Accept your invitation" })).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page).toHaveURL(/\/portal\/projects\//);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByText(deliverableName, { exact: true })).toBeVisible();
  await expect(page.getByText(invoiceDescription, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as Paid" })).toHaveCount(0);
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  const pdfLink = page.getByRole("link", { name: "Download PDF" });
  const pdfPath = await pdfLink.getAttribute("href");
  expect(pdfPath).toMatch(/^\/api\/invoices\//);
  const pdfResponse = await page.context().request.get(new URL(pdfPath!, page.url()).toString());
  expect(pdfResponse.ok()).toBeTruthy();
  expect(pdfResponse.headers()["content-type"]).toMatch(/application\/pdf/i);
  await page.reload();
  await expect(page).toHaveURL(/\/portal\/projects\//);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/portal\/expired/);

  await page.goto("/reset-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your inbox", { exact: true })).toBeVisible();
  await expect.poll(async () => latestMail(request, email), { timeout: 20_000 })
    .toMatch(/reset-password/i);
  const resetRaw = await latestMail(request, email);
  const resetUrl = extractEmailUrl(resetRaw, "reset-password");
  expect(resetUrl, "SMTP capture should contain the one-time reset link").toBeTruthy();
  await page.goto(resetUrl!);
  await page.getByLabel("New password").fill(changedPassword);
  await page.getByLabel("Confirm password").fill(changedPassword);
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page).toHaveURL(/login/);

  await page.goto(resetUrl!);
  await expect(page.getByText("Reset link invalid", { exact: true })).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator("input#password").fill(changedPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
});
