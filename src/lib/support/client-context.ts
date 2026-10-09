import { z } from "zod";

/**
 * Where a support request was sent from: the browser, screen and time zone.
 * Collected so the platform team can reproduce a problem without asking
 * "which browser are you on?" first.
 */
export const clientContextSchema = z
  .object({
    timezone: z.string().max(60).optional(),
    language: z.string().max(20).optional(),
    screen: z.string().max(20).optional(),
    viewport: z.string().max(20).optional(),
  })
  .optional();

export type ClientContext = NonNullable<z.infer<typeof clientContextSchema>> & { userAgent?: string; uiLocale?: string };

export function parseContext(raw: string | null): ClientContext | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ClientContext;
  } catch {
    return null;
  }
}

/** A readable browser, OS and device from a user-agent string. Good enough for support, not for analytics. */
export function describeUserAgent(ua: string | undefined): { browser: string | null; os: string | null; mobile: boolean } {
  if (!ua) return { browser: null, os: null, mobile: false };
  const version = (re: RegExp) => ua.match(re)?.[1]?.split(".")[0];
  let browser: string | null = null;
  if (/Edg\//.test(ua)) browser = `Edge ${version(/Edg\/([\d.]+)/)}`;
  else if (/OPR\//.test(ua)) browser = `Opera ${version(/OPR\/([\d.]+)/)}`;
  else if (/YaBrowser\//.test(ua)) browser = `Yandex ${version(/YaBrowser\/([\d.]+)/)}`;
  else if (/Firefox\//.test(ua)) browser = `Firefox ${version(/Firefox\/([\d.]+)/)}`;
  else if (/Chrome\//.test(ua)) browser = `Chrome ${version(/Chrome\/([\d.]+)/)}`;
  else if (/Safari\//.test(ua)) browser = `Safari ${version(/Version\/([\d.]+)/) ?? ""}`.trim();

  let os: string | null = null;
  if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/iPhone|iPad/.test(ua)) os = `iOS ${ua.match(/OS (\d+)_/)?.[1] ?? ""}`.trim();
  else if (/Android/.test(ua)) os = `Android ${version(/Android ([\d.]+)/) ?? ""}`.trim();
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return { browser, os, mobile: /Mobi|iPhone|Android/.test(ua) };
}
