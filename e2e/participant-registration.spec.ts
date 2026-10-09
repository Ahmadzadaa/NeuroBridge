import { test, expect } from "@playwright/test";
import { E2E_PROGRAM_TOKEN } from "./helpers/db";

test.describe("Participant registration", () => {
  test("registers via public apply page", async ({ page }) => {
    const email = `e2e-reg-${Date.now()}@test.com`;

    await page.goto(`/en/apply/${E2E_PROGRAM_TOKEN}`);
    await expect(page.getByText("E2E Entrepreneurship Program")).toBeVisible();

    await page.locator("#firstName").fill("Playwright");
    await page.locator("#lastName").fill("User");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page).toHaveURL(/\/en\/login/, { timeout: 15_000 });
  });
});
