import { headers } from "next/headers";

/**
 * The origin this app is being served from, for building absolute links
 * (invites, emails, QR codes) inside server components.
 *
 * Route handlers can read `new URL(request.url).origin` directly; server
 * components have no request object, so the origin is derived from the
 * forwarded headers instead. An explicit `APP_BASE_URL` always wins, which is
 * what production should set — behind a proxy the Host header is attacker
 * controllable, and a poisoned invite link is worth guarding against.
 */
export async function getAppOrigin(): Promise<string> {
  const configured =
    process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return "http://localhost:3000";

  const forwardedProto = headerList.get("x-forwarded-proto");
  const proto =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${proto}://${host}`;
}
