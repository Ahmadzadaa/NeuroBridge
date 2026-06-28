import { test, expect } from "@playwright/test";
import { prisma } from "./helpers/db";
import { issueCertificate } from "../src/lib/certificates/certificate-service";
import { loginAsParticipant } from "./helpers/auth";
import {
  E2E_PARTICIPANT_EMAIL,
  E2E_TENANT_ID,
} from "./helpers/db";

test.describe("Certificate generation", () => {
  test("participant sees issued certificate", async ({ page }) => {
    const participant = await prisma.user.findFirst({
      where: { email: E2E_PARTICIPANT_EMAIL, tenantId: E2E_TENANT_ID },
    });

    expect(participant).not.toBeNull();

    await prisma.certificate.deleteMany({ where: { userId: participant!.id } });

    await issueCertificate({
      userId: participant!.id,
      tenantId: E2E_TENANT_ID,
      type: "PARTICIPATION",
    });

    await loginAsParticipant(page);
    await page.goto("/en/participant/certificates");

    await expect(page.getByTestId("certificate-item")).toBeVisible();
    await expect(page.getByText("PARTICIPATION")).toBeVisible();
  });
});
