import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  getCallbackUrl,
  getPaytrCredentials,
  getPaytrMode,
  isPaytrConfigured,
  missingPaytrVars,
} from "../src/lib/payment/paytr/paytr.config";
import {
  buildCallbackHash,
  buildMerchantOid,
} from "../src/lib/payment/paytr/paytr.hash";
import { createSeatCheckout } from "../src/lib/billing/checkout-service";
import { createInvoice } from "../src/lib/billing/invoice-service";
import { createSubscription } from "../src/lib/billing/subscription-service";

/**
 * End-to-end sandbox exercise of the PayTR flow.
 *
 * What it proves, in order: credentials are loadable, PayTR accepts our token
 * request and returns a payment page, a correctly signed callback settles the
 * invoice and grants seats, the same callback sent twice does not grant them
 * again, and a forged hash is refused.
 *
 * Two guards make it safe to run:
 *
 *  1. It refuses to run while PAYTR_MODE=live. Nothing here should ever touch a
 *     real merchant account, and a flag that could disable that check would
 *     eventually be passed by accident.
 *  2. It creates its own tenant, plan, subscription and invoice, and removes
 *     them again unless --keep is passed. It never touches existing rows.
 *
 * Usage:
 *   npm run paytr:smoke               full run against a running dev server
 *   npm run paytr:smoke -- --offline  skip the PayTR call, exercise callbacks
 *   npm run paytr:smoke -- --keep     leave the fixtures behind for inspection
 *
 * The callback steps POST to the running application, so `npm run dev` (or a
 * deployed staging URL in NEXT_PUBLIC_APP_URL) must be up. That is deliberate:
 * calling the service directly would skip the route, the hash check and the
 * raw-body handling, which is most of what can actually break.
 */

const KEEP = process.argv.includes("--keep");
const OFFLINE = process.argv.includes("--offline");

interface Step {
  name: string;
  ok: boolean;
  detail: string;
}

const steps: Step[] = [];

function record(name: string, ok: boolean, detail = ""): boolean {
  steps.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
  return ok;
}

/** Small on purpose: sandbox reports are easier to read at a round amount. */
const AMOUNT_KURUS = 1000;

const SEATS = 3;

async function postCallback(
  url: string,
  fields: Record<string, string>
): Promise<{ status: number; body: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
  return { status: response.status, body: (await response.text()).trim() };
}

async function main(): Promise<void> {
  const mode = getPaytrMode();

  if (mode === "live") {
    console.error(
      "Refusing to run: PAYTR_MODE=live. This script simulates callbacks and " +
        "must never point at a live merchant account. Set PAYTR_MODE=sandbox."
    );
    process.exit(2);
  }

  console.log(`PayTR smoke test - mode=${mode}${OFFLINE ? " (offline)" : ""}\n`);

  // ---------------------------------------------------------------- config
  const configured = isPaytrConfigured();
  if (
    !record(
      "Sandbox credentials are present",
      configured,
      configured ? "" : `missing: ${missingPaytrVars().join(", ")}`
    )
  ) {
    process.exit(1);
  }

  const credentials = getPaytrCredentials();
  record(
    "test_mode is on",
    credentials.testMode === 1,
    `test_mode=${credentials.testMode}`
  );

  const callbackUrl = getCallbackUrl();
  console.log(`\nCallback URL under test: ${callbackUrl}\n`);

  // -------------------------------------------------------------- fixtures
  const suffix = Date.now().toString(36);
  const tenant = await prisma.tenant.create({
    data: {
      name: `PayTR smoke ${suffix}`,
      status: "PENDING",
      seatLimit: 0,
      email: `paytr-smoke-${suffix}@example.com`,
    },
  });

  const plan = await prisma.plan.create({
    data: {
      name: `PayTR smoke plan ${suffix}`,
      pricePerSeatMonthly: Math.round(AMOUNT_KURUS / SEATS),
      minSeats: 1,
      isActive: false,
    },
  });

  // The subscription and invoice are created through the same services the
  // POST /api/billing/subscription route uses, so the fixture cannot drift
  // away from what a real signup produces.
  const { subscription, amountDue, period } = await createSubscription({
    tenantId: tenant.id,
    planId: plan.id,
    seats: SEATS,
  });

  const invoice = await createInvoice({
    tenantId: tenant.id,
    subscriptionId: subscription.id,
    amount: amountDue,
    type: "SUBSCRIPTION",
    seatCount: SEATS,
    periodStart: period.start,
    periodEnd: period.end,
  });

  record(
    "Invoice created with a unique merchant_oid",
    Boolean(invoice.merchantOid),
    invoice.merchantOid
  );

  const forgedOid = buildMerchantOid(tenant.id);

  try {
    // ------------------------------------------------------- 1. get-token
    if (OFFLINE) {
      record("PayTR issued a payment token", true, "skipped (--offline)");
    } else {
      try {
        const checkout = await createSeatCheckout({
          invoice,
          customerEmail: `paytr-smoke-${suffix}@example.com`,
          userIp: "127.0.0.1",
        });
        record("PayTR issued a payment token", true, checkout.checkoutUrl);
      } catch (error) {
        // "Gecersiz istek veya magaza aktif degil" is what PayTR answers to
        // placeholder credentials - a configuration answer, not a code fault.
        record(
          "PayTR issued a payment token",
          false,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    // ------------------------------------------------- 2. signed callback
    const signed = {
      merchant_oid: invoice.merchantOid,
      status: "success",
      total_amount: String(invoice.amount),
      payment_type: "card",
      currency: "TL",
      hash: buildCallbackHash(credentials, {
        merchantOid: invoice.merchantOid,
        status: "success",
        totalAmount: String(invoice.amount),
      }),
    };

    let first: { status: number; body: string };
    try {
      first = await postCallback(callbackUrl, signed);
    } catch (error) {
      record(
        "Callback endpoint is reachable",
        false,
        `${callbackUrl} - ${error instanceof Error ? error.message : error}`
      );
      console.error("\nStart the application first (npm run dev), then re-run.");
      process.exitCode = 1;
      return;
    }

    record(
      "Signed callback answered OK",
      first.status === 200 && first.body === "OK",
      `HTTP ${first.status} "${first.body}"`
    );

    const paid = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    record("Invoice is PAID", paid?.status === "PAID", `status=${paid?.status}`);

    const activated = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });
    record(
      "Subscription is ACTIVE with no dunning state",
      activated?.status === "ACTIVE" &&
        activated.dunningAttempts === 0 &&
        activated.pastDueSince === null,
      `status=${activated?.status} dunningAttempts=${activated?.dunningAttempts}`
    );

    const seated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    record(
      "Seats were granted",
      seated?.seatLimit === SEATS,
      `seatLimit=${seated?.seatLimit}`
    );

    // ------------------------------------------------ 3. duplicate replay
    const replay = await postCallback(callbackUrl, signed);
    record(
      "Replayed callback still answers OK",
      replay.status === 200 && replay.body === "OK",
      `HTTP ${replay.status} "${replay.body}"`
    );

    const afterReplay = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    record(
      "Replay did not grant seats twice",
      afterReplay?.seatLimit === SEATS,
      `seatLimit=${afterReplay?.seatLimit}`
    );

    const successful = await prisma.paymentTransaction.count({
      where: { invoiceId: invoice.id, status: "SUCCESS" },
    });
    record(
      "Replay recorded no second successful transaction",
      successful === 1,
      `successful transactions=${successful}`
    );

    // -------------------------------------------------- 4. forged callback
    const forged = await postCallback(callbackUrl, {
      merchant_oid: forgedOid,
      status: "success",
      total_amount: String(invoice.amount),
      hash: "forged",
    });
    record(
      "Forged hash was rejected",
      forged.status === 400,
      `HTTP ${forged.status} "${forged.body}"`
    );

    // --------------------------------------------------- 5. the audit log
    const logged = await prisma.paytrWebhookEvent.findMany({
      where: { merchantOid: { in: [invoice.merchantOid, forgedOid] } },
      orderBy: { receivedAt: "asc" },
      select: { merchantOid: true, outcome: true, hashValid: true, rawPayload: true },
    });

    record(
      "Every delivery was logged",
      logged.length === 3,
      logged
        .map((row) => `${row.outcome}${row.hashValid ? "" : "/unsigned"}`)
        .join(", ")
    );

    record(
      "No callback hash was stored",
      logged.every((row) => !row.rawPayload.includes(signed.hash)),
      "raw_payload is masked"
    );
  } finally {
    if (KEEP) {
      console.log(`\nFixtures kept: tenant=${tenant.id} invoice=${invoice.id}`);
    } else {
      // Only rows this run created: both order ids embed the fixture tenant id.
      const oids = [invoice.merchantOid, forgedOid];
      await prisma.paytrWebhookEvent.deleteMany({
        where: { merchantOid: { in: oids } },
      });
      await prisma.webhookEvent.deleteMany({
        where: { externalEventId: { in: oids } },
      });
      await prisma.tenant.delete({ where: { id: tenant.id } });
      await prisma.plan.delete({ where: { id: plan.id } });
      console.log("\nFixtures removed.");
    }
  }

  const failed = steps.filter((step) => !step.ok);
  console.log(`\n${steps.length - failed.length}/${steps.length} checks passed.`);
  if (failed.length > 0) {
    console.log(`Failed: ${failed.map((step) => step.name).join("; ")}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("\npaytr-smoke-test failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
