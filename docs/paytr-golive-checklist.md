# PayTR go-live checklist

Manual steps for switching from the sandbox to a live merchant account. Nothing
here is automated on purpose: each step either needs a decision, a credential
that must not pass through this repository, or a real card.

Work top to bottom. Do not skip §5 (rehearsal) — it is the only step that
exercises the live account without moving money.

---

## 1. What to collect from the PayTR account holder

The account belongs to the business partner, so these have to be requested. All
three are found in the PayTR merchant panel under **Bilgi › Mağaza Bilgileri**
(*Merchant Information*).

| Item | PayTR panel label | Notes |
| --- | --- | --- |
| Merchant ID | `Mağaza No` | Numeric, ~6 digits. Not a secret on its own, but treated as one. |
| Merchant Key | `Mağaza Parolası` | **Secret.** Signs every request. |
| Merchant Salt | `Mağaza Gizli Anahtarı` | **Secret.** Signs every request. |

Also needed from them:

- [ ] **Panel access, or a named contact who has it.** The notification URL
      (§3) can only be set inside the panel. If access is not shared, someone
      on their side has to make that change and confirm it.
- [ ] **Which currency the account is enabled for.** The system charges in TRY
      (PayTR spells it `TL`). Anything else needs a decision before go-live.
- [ ] **Whether the account has Non3D enabled** — see §7. Without it, automatic
      monthly charging is impossible and renewal falls back to emailing a
      payment link. This is a permission PayTR grants per account, on request.
- [ ] **Whether the iFrame flow returns a `utoken`** (card vaulting). PayTR
      support has to answer this; see `docs/billing-paytr.md` §7.
- [ ] **The settlement account and payout schedule**, so a payment that
      succeeds here can be reconciled against money actually arriving.
- [ ] **Which test card simulates a decline**, so the dunning path (§8) can be
      exercised deliberately rather than by waiting for a real failure.

> **Never** accept these credentials over chat or email, and never put them in
> `.env`, a commit, a ticket, or a screenshot. They go straight into the
> production secret store.

---

## 2. Put the credentials in the secret store

Live credentials are read **only** from the `PAYTR_LIVE_*` variables. The
pre-split `PAYTR_MERCHANT_*` names are deliberately ignored in live mode:
nothing about that name says whether it holds a sandbox or a production key,
and guessing is how test keys reach production.

```
PAYTR_MODE=live
PAYTR_LIVE_MERCHANT_ID=<Mağaza No>
PAYTR_LIVE_MERCHANT_KEY=<Mağaza Parolası>
PAYTR_LIVE_MERCHANT_SALT=<Mağaza Gizli Anahtarı>
PAYTR_TEST_MODE=1          # keep for the rehearsal in §5, remove in §6
PAYTR_NON3D_ENABLED=0      # only after §7 is confirmed
```

- [ ] Stored in the secret store (AWS Secrets Manager / SSM), not in a file.
- [ ] `NEXT_PUBLIC_APP_URL` is the real **https** URL. The application refuses
      to boot in live mode with an http URL, because PayTR posts the payment
      notification to it.
- [ ] Old sandbox variables removed from the production environment, so nobody
      later wonders which set is in use.

The application validates all of this at startup (`src/lib/env-check.ts`) and
**refuses to boot** in live mode if any live credential is missing. A container
that will not start is the intended outcome — a container that starts and fails
at checkout is worse.

---

## 3. Register the notification URL in the PayTR panel

PayTR posts the payment result server-to-server to a URL configured in the
panel. It is not sent per request, so this is the single point of failure that
looks like "payments succeed but nothing happens in the app".

- [ ] In the panel, set the notification URL (`Bildirim URL`) to:

      https://<production-domain>/api/billing/paytr/callback

- [ ] Confirm it is **https** and reachable from the public internet (no VPN,
      no basic auth, no WAF rule that blocks POST from unknown IPs).
- [ ] Confirm the merchant panel shows the change as saved. Ask for a
      screenshot if the partner made it.

### IP allowlist

PayTR does not publish a stable, contractual list of source IPs, so the
callback endpoint **does not** filter by IP — a change on their side would
silently break every payment.

What the system does instead: it records the source IP of every notification in
`paytr_webhook_events.remote_ip`.

- [ ] After the first live payments, read the observed IPs:

      SELECT remote_ip, count(*) FROM paytr_webhook_events
      WHERE hash_valid = true GROUP BY remote_ip;

- [ ] If the infrastructure team wants an allowlist, apply it at the load
      balancer / WAF using those addresses — never in application code, and
      only after asking PayTR support to confirm the range.

Authenticity does not depend on this: every callback is HMAC-verified before
anything is written.

---

## 4. Pre-flight, still on sandbox

Run these before switching the mode. They cost nothing and catch most of what
goes wrong.

- [ ] `npm run typecheck && npm test`
- [ ] `npm run paytr:smoke` against a running dev server with sandbox
      credentials. It exercises the whole path: token request → signed callback
      → invoice paid → seats granted → replayed callback changes nothing →
      forged hash rejected → every delivery logged with no hash stored.
- [ ] Confirm the migration has been applied on the target database:
      `paytr_webhook_events` must exist.

---

## 5. Rehearsal: live credentials, no money

This is the step that de-risks go-live. With `PAYTR_MODE=live` and
`PAYTR_TEST_MODE=1`, requests are signed with the **real** merchant key and
sent to the **real** endpoint, but PayTR treats every charge as a test.

The application logs a warning on every boot in this state, so it cannot be
left on by accident.

- [ ] Deploy with `PAYTR_TEST_MODE=1`.
- [ ] Start a subscription from the billing screen. The payment page must open
      — this proves the merchant ID, key and salt are correct together. A wrong
      credential answers *"Gecersiz istek veya magaza aktif degil"*.
- [ ] Pay with a PayTR test card (see `docs/billing-paytr.md` §9.2).
- [ ] Confirm the callback arrived: a row in `paytr_webhook_events` with
      `hash_valid = true` and `outcome = 'PROCESSED'`. **If there is no row at
      all, the notification URL in §3 is wrong** — that is the single most
      common go-live failure.
- [ ] Confirm the invoice is `PAID`, the subscription `ACTIVE`, and
      `tenants.seat_limit` matches the purchased seats.

---

## 6. First real payment

- [ ] Remove `PAYTR_TEST_MODE` from the environment and redeploy. Confirm the
      rehearsal warning is gone from the boot logs.
- [ ] Create a plan with a **deliberately small price** (e.g. 1 seat at ₺1) and
      buy it with a real card. Do not start with a customer's real invoice.
- [ ] Verify, in this order:
  - [ ] the payment page opens and the card is charged;
  - [ ] `paytr_webhook_events` has one `PROCESSED` row;
  - [ ] the invoice is `PAID` and the seats are granted;
  - [ ] the transaction appears in the PayTR panel;
  - [ ] the amount matches to the kuruş — the app sends integer kuruş, so ₺1
        is `100`. A factor-of-100 error shows up here and nowhere earlier.
- [ ] Wait for the settlement date and confirm the money actually reaches the
      partner's account. A successful callback is not the same as a payout.

---

## 7. Refunds

Refunds are **not implemented in this system**. There is no refund endpoint and
no `payment.refunded` path wired to PayTR.

- [ ] Perform the refund of the §6 test payment from the **PayTR panel**.
- [ ] Confirm the refund reaches the card.
- [ ] Note what the panel does — whether a notification is sent to the callback
      URL. If it is, it will currently be rejected as an unmatched order and
      logged in `paytr_webhook_events` with `outcome = 'UNMATCHED'`. Check for
      such rows after refunding.
- [ ] Until a refund flow is built, agree the manual procedure: refund in the
      panel, then adjust the seat count in the app by hand.

This gap is deliberate rather than overlooked — building a refund path against
an untested account would be guesswork. It is the first thing to add after
go-live.

---

## 8. Dunning (failed renewal)

Renewal runs from `npm run billing:cron` plus the worker, not from the web
process. Confirm both are scheduled on the production host before relying on
them.

- [ ] Ask PayTR which test card declines, and reproduce a failed charge
      (rehearsal mode, §5).
- [ ] Back-date a subscription so renewal is due:

      npx tsx -e "..." # see docs/billing-paytr.md §9.5

- [ ] `npm run billing:cron` then `npm run worker:once`.
- [ ] Confirm: the subscription becomes `PAST_DUE`, a retry is scheduled for
      day 1/3/5, and the tenant admin receives the email.
- [ ] Confirm that after 7 unpaid days the subscription becomes `EXPIRED` and
      the tenant is **read-only, with no data deleted**.
- [ ] Confirm that paying afterwards returns it to `ACTIVE`.

---

## 9. Automatic renewal (only if PayTR confirms card vaulting)

Leave `PAYTR_NON3D_ENABLED=0` until **both** answers from §1 are yes: the
iFrame flow returns a `utoken`, and Non3D is enabled on the account.

- [ ] After a live payment, check whether a row appeared in `payment_methods`.
      If it did, the iFrame flow does vault cards.
- [ ] Only then set `PAYTR_NON3D_ENABLED=1`, and re-run §8 to confirm an
      automatic charge is attempted rather than an emailed link.

Until then renewal works by emailing the tenant an invoice and a payment link.
That is a working flow, not a broken one.

---

## 10. After go-live: what to watch

Structured logs are emitted as one JSON object per line, tagged
`"component":"paytr"`. Useful filters:

| Question | Filter |
| --- | --- |
| Did a payment page fail to open? | `event = "checkout.token_failed"` |
| Is someone forging callbacks? | `event = "callback.rejected"` |
| Are notifications arriving at all? | `event = "callback.received"` |
| Did an automatic charge decline? | `event = "recurring.charge_declined"` |

No log line and no stored payload ever contains the merchant key, the merchant
salt, a `paytr_token`, a callback `hash`, or card data. Card handles appear
only as a non-reversible fingerprint. This is enforced in
`src/lib/payment/paytr/paytr-log.ts` and tested — if a log line has to carry a
new field, add it there rather than formatting it at the call site.

- [ ] Set an alert on `callback.failed` and on `outcome = 'ERROR'` rows in
      `paytr_webhook_events`. A genuine notification that cannot be applied is
      a payment the customer made and did not receive.

---

## 11. Rollback

If something is wrong after go-live:

1. Set `PAYTR_TEST_MODE=1` and redeploy — the live account stays connected but
   no further money moves. Faster and less disruptive than reverting keys.
2. If the fault is in this system rather than the configuration, set
   `PAYTR_MODE=sandbox`. Checkout then fails cleanly with a 503 rather than
   half-charging anyone.
3. Payments already taken are unaffected either way: settled invoices are rows
   in the database, and `paytr_webhook_events` retains the full delivery
   history for reconciliation.
