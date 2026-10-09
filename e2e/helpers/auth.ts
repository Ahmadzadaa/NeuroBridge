import type { Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  email: string,
  password: string,
  locale = "en"
): Promise<void> {
  await page.goto(`/${locale}/login`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in|giriş|daxil/i }).click();
}

export async function loginAsParticipant(page: Page): Promise<void> {
  const email = process.env.E2E_PARTICIPANT_EMAIL ?? "e2e-participant@bizsim.com";
  const password = process.env.E2E_PASSWORD ?? "Admin123!";
  await loginAs(page, email, password);
  await page.waitForURL(/\/(en|tr|az)\/participant/, { timeout: 30_000 });
}
