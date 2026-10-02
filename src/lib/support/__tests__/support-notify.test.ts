import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ supportTicket: { findUnique: vi.fn() } }));
const mail = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/email/email-service", () => mail);
vi.mock("@/lib/notifications/notification-service", () => ({ notifyPlatformTeam: vi.fn(), notifyUsers: vi.fn() }));

import { supportTicketEmail } from "@/lib/email/templates";
import { notifyNewTicket } from "@/lib/support/support-notify";

const ticket = {
  subject: "Loqo görünmür",
  createdAt: new Date("2026-10-03T09:00:00Z"),
  tenant: { name: "Demo Teknopark" },
  createdBy: { firstName: "Admin", lastName: "User", email: "admin@example.com" },
  messages: [{ body: "Salam" }],
};

describe("supportTicketEmail", () => {
  it("escapes what the organisation typed and keeps the subject on one line", () => {
    const { subject, html } = supportTicketEmail({
      organisation: "Org",
      authorName: "A",
      authorEmail: "a@example.com",
      topic: "Hi\r\nBcc: x@example.com",
      message: "<script>alert(1)</script>",
      ticketUrl: "https://app.example.com/az/super-admin/support/t1",
      submittedAt: new Date(),
      locale: "az",
    });
    expect(subject).not.toMatch(/[\r\n]/);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("https://app.example.com/az/super-admin/support/t1");
  });
});

describe("notifyNewTicket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPPORT_NOTIFICATION_EMAIL", "team@example.com");
    db.supportTicket.findUnique.mockResolvedValue(ticket);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("mails the platform team a link to the request", async () => {
    mail.sendEmail.mockResolvedValue({ sent: true, provider: "console" });
    expect(await notifyNewTicket("t1", "https://app.example.com")).toBe(true);
    expect(mail.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "team@example.com", subject: expect.stringContaining("Demo Teknopark") }));
    expect(mail.sendEmail.mock.calls[0][0].html).toContain("https://app.example.com/");
  });

  it("never throws when mail fails or nobody is configured", async () => {
    mail.sendEmail.mockRejectedValue(new Error("SES down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(notifyNewTicket("t1", "https://app.example.com")).resolves.toBe(false);

    vi.stubEnv("SUPPORT_NOTIFICATION_EMAIL", "");
    vi.stubEnv("LEADS_NOTIFICATION_EMAIL", "");
    vi.stubEnv("EMAIL_FROM", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(notifyNewTicket("t1", "https://app.example.com")).resolves.toBe(false);
  });
});
