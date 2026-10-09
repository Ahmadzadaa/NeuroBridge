import { test, expect } from "@playwright/test";
import { createExhaustedSeatTenant, cleanupE2ETenant } from "./helpers/db";

test.describe("Seat exhaustion", () => {
  test("blocks registration when tenant seats are full", async ({ page }) => {
    const { tenantId, token } = await createExhaustedSeatTenant();

    await page.goto(`/en/apply/${token}`);
    await expect(page.getByText("Organization seat limit reached.")).toBeVisible();

    await cleanupE2ETenant(tenantId);
  });
});
