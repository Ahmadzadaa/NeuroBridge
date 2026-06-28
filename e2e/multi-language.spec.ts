import { test, expect } from "@playwright/test";

test.describe("Multi-language switching", () => {
  test("switches locale on login page", async ({ page }) => {
    await page.goto("/tr/login");
    await expect(page.getByText("Hesabınıza Giriş Yapın")).toBeVisible();

    await page.getByRole("button", { name: "Change language" }).click();
    await page.getByText("English").click();

    await expect(page).toHaveURL(/\/en\/login/);
    await expect(page.getByText("Sign In to Your Account")).toBeVisible();

    await page.getByRole("button", { name: "Change language" }).click();
    await page.getByText("Azərbaycanca").click();

    await expect(page).toHaveURL(/\/az\/login/);
    await expect(page.getByText("Hesabınıza Daxil Olun")).toBeVisible();
  });
});
