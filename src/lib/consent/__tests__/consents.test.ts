import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { userConsent: { createMany: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import {
  canUniversitySeePsychResults,
  ConsentRequiredError,
  getCurrentConsents,
  needsConsent,
  recordConsents,
  UI_CONSENT_VERSION,
} from "@/lib/consent/consents";
import { isNoticeSetCurrent, noticesFor, noticeSetVersion } from "@/lib/consent/notices";

const at = (iso: string) => new Date(iso);
const answers = { privacyNotice: true, dataUse: false, opportunities: true, psychResultsShare: false };

describe("notices", () => {
  it("shows KVKK in tr/az and KVKK + GDPR in en", () => {
    expect(noticesFor("tr").map((n) => n.code)).toEqual(["kvkk"]);
    expect(noticesFor("az").map((n) => n.code)).toEqual(["kvkk"]);
    expect(noticesFor("en").map((n) => n.code)).toEqual(["kvkk", "gdpr"]);
    expect(noticesFor("az")[0].draft).toBe(true);
  });

  it("records which notice set was shown and detects stale versions", () => {
    expect(noticeSetVersion("tr")).toBe("kvkk-tr@2026-09");
    expect(noticeSetVersion("en")).toBe("kvkk-en@2026-09+gdpr@2026-09");
    expect(isNoticeSetCurrent(noticeSetVersion("en"))).toBe(true);
    expect(isNoticeSetCurrent("kvkk-tr@2020-01")).toBe(false);
    expect(isNoticeSetCurrent("")).toBe(false);
  });
});

describe("consents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores all four answers with the notice set version and ip", async () => {
    await recordConsents("usr_1", answers, { locale: "en", ip: "1.2.3.4" });

    const { data } = vi.mocked(prisma.userConsent.createMany).mock.calls[0][0] as { data: object[] };
    const notices = "kvkk-en@2026-09+gdpr@2026-09";
    expect(data).toEqual([
      { userId: "usr_1", type: "PRIVACY_NOTICE", granted: true, version: notices, ip: "1.2.3.4" },
      { userId: "usr_1", type: "DATA_USE", granted: false, version: notices, ip: "1.2.3.4" },
      { userId: "usr_1", type: "OPPORTUNITIES", granted: true, version: UI_CONSENT_VERSION, ip: "1.2.3.4" },
      { userId: "usr_1", type: "PSYCH_RESULTS_SHARE", granted: false, version: UI_CONSENT_VERSION, ip: "1.2.3.4" },
    ]);
  });

  it("requires the notice acknowledgement but not the data-use consent", async () => {
    await expect(
      recordConsents("usr_1", { ...answers, privacyNotice: false, dataUse: true }, { locale: "tr" })
    ).rejects.toBeInstanceOf(ConsentRequiredError);
    expect(prisma.userConsent.createMany).not.toHaveBeenCalled();

    await expect(recordConsents("usr_1", { ...answers, dataUse: false }, { locale: "tr" })).resolves.toBeUndefined();
  });

  it("uses the latest answer per type", async () => {
    // findMany is ordered newest first.
    vi.mocked(prisma.userConsent.findMany).mockResolvedValue([
      { type: "PSYCH_RESULTS_SHARE", granted: false, version: "2026-09", createdAt: at("2026-10-02") },
      { type: "PRIVACY_NOTICE", granted: true, version: "kvkk-tr@2026-09", createdAt: at("2026-10-01") },
      { type: "PSYCH_RESULTS_SHARE", granted: true, version: "2026-09", createdAt: at("2026-10-01") },
    ] as never);

    const current = await getCurrentConsents("usr_1");

    expect(current.PSYCH_RESULTS_SHARE).toMatchObject({ granted: false });
    expect(current.PRIVACY_NOTICE).toMatchObject({ granted: true });
    expect(current.OPPORTUNITIES).toBeNull();
    expect(needsConsent(current)).toBe(false);
  });

  it("asks again when the notice is missing or its text version changed", () => {
    const base = { DATA_USE: null, OPPORTUNITIES: null, PSYCH_RESULTS_SHARE: null };
    expect(needsConsent({ ...base, PRIVACY_NOTICE: null })).toBe(true);
    expect(
      needsConsent({ ...base, PRIVACY_NOTICE: { granted: true, version: "kvkk-tr@2020-01", at: at("2020-01-01") } })
    ).toBe(true);
  });

  it("hides psychological results from the university unless separately consented", async () => {
    vi.mocked(prisma.userConsent.findFirst).mockResolvedValueOnce(null);
    expect(await canUniversitySeePsychResults("usr_1")).toBe(false);

    vi.mocked(prisma.userConsent.findFirst).mockResolvedValueOnce({ granted: false } as never);
    expect(await canUniversitySeePsychResults("usr_1")).toBe(false);

    vi.mocked(prisma.userConsent.findFirst).mockResolvedValueOnce({ granted: true } as never);
    expect(await canUniversitySeePsychResults("usr_1")).toBe(true);
  });
});
