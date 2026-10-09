import { test, expect } from "@playwright/test";
import { prisma } from "./helpers/db";
import { issueCertificates } from "../src/lib/certificates/issue-service";
import { loginAsParticipant } from "./helpers/auth";
import { E2E_PARTICIPANT_EMAIL, E2E_TENANT_ID } from "./helpers/db";

test.describe("Certificate generation", () => {
  test("participant sees an issued certificate and can download it", async ({
    page,
  }) => {
    const participant = await prisma.user.findFirst({
      where: { email: E2E_PARTICIPANT_EMAIL, tenantId: E2E_TENANT_ID },
    });
    expect(participant).not.toBeNull();

    await prisma.certificate.deleteMany({ where: { userId: participant!.id } });

    const [outcome] = await issueCertificates({
      tenantId: E2E_TENANT_ID,
      issuedByUserId: participant!.id,
      templateId: "participation",
      title: "E2E Programme",
      body: "Completed the E2E programme.",
      recipients: [{ userId: participant!.id, name: "E2E Participant" }],
    });
    expect(outcome.status).toBe("issued");

    await loginAsParticipant(page);
    await page.goto("/en/participant/certificates");

    const item = page.getByTestId("certificate-item");
    await expect(item).toBeVisible();
    await expect(item).toContainText("E2E Programme");
    // The serial is the document's identity — it must be shown to the holder.
    await expect(item).toContainText(/BIZ-\d{4}-[A-Z]{3}-\d{6}/);

    // The PDF is served through the permissioned route, not a public path.
    const download = item.getByRole("link", { name: /download|endir|indir/i });
    await expect(download).toHaveAttribute(
      "href",
      /\/api\/certificates\/[a-z0-9]+\/file/
    );
  });
});
