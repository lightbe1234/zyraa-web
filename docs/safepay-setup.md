# Safepay setup

Implemented locally using the official `@sfpy/node-core` 0.3.5 SDK. Card payments collect the full server-calculated PKR order total in advance; no extra gateway fee is passed to the shopper. Card entry happens on Safepay hosted checkout. No card data is accepted or stored by this website.

## Activation still required

1. Create a Safepay sandbox merchant account, then obtain its public API key, secret API key and endpoint webhook shared secret. Put these only in the ignored `.env.local` variables listed in `.env.example`; do not paste secrets into source or chat.
2. Apply `supabase/migrations/202609070001_safepay.sql` to a test database first. This migration has been prepared, not applied to the shared live Supabase database.
3. Set `NEXT_PUBLIC_SITE_URL` to the return origin. For local webhook testing, an explicitly configured public HTTPS tunnel is needed. No tunnel has been started.
4. Configure Safepay Developers → Endpoints → `/api/payments/safepay/webhook`, subscribing to `payment.succeeded` version 2.0.0. Set `SAFEPAY_ENVIRONMENT=sandbox` and `SAFEPAY_ENABLED=true`, then restart the dev server. Never enter real card details in sandbox.
5. Verify a sandbox success, cancellation/reopen, failed card, duplicate callback, wrong amount/currency/merchant rejection, and callback arriving before the browser redirect. Verify order stock and admin status against the database.
6. Only after merchant approval, sandbox verification and explicit deployment authorization, configure production keys/HTTPS/webhook and apply the reviewed migration in production.

## Payment behavior

Checkout now shows Billing & payment and an explicitly unavailable Safepay card until credentials, enable flag and payment table are present. Admin → payments lists configuration readiness without exposing secrets. Existing COD/bank options continue to work. Order creation is transactional with server prices and stock. Checkout retry keys and saved payment references survive reload without storing form entries. Each order claims one tracker creation; a network timeout with an unknown provider outcome remains blocked for manual reconciliation instead of creating another potentially chargeable session. If a tracker is attached, retries reopen that tracker. Do not delete the claim to retry without checking Safepay first.

Signed successful callbacks must match the merchant, tracker, PKR amount and environment before a transaction marks payment paid and confirms the order. Repeated events are idempotent. Redirect parameters cannot mark orders paid. Admin fulfilment of unpaid Safepay orders is blocked by a database trigger. Late payment on a cancelled order is flagged PAID_REVIEW_REQUIRED, never automatically fulfilled. Pending orders reserve stock; admins can cancel abandoned orders to restore stock using the existing workflow. Refunds are manual in Safepay and must be reconciled separately; automatic refunds are not implemented. Subscribe only to the supported payment.succeeded event.

No sandbox/live payment has been run because merchant credentials are not configured. Conversion is not guaranteed by checkout design.

## Verification performed locally

An isolated PostgreSQL runtime executes the actual payment migration and verifies server totals, stock, idempotent order creation, duplicate callbacks, incorrect amount/currency/environment rejection, unpaid fulfilment blocking and late-payment review. Browser tests verify mobile/desktop billing, saved-order recovery after reload, and the difference between an untrusted redirect and a confirmed server payment status. These do not replace a real Safepay sandbox payment or merchant activation.

Sources: https://safepay-docs.netlify.app/build-your-integration/express-checkout/ and https://safepay-docs.netlify.app/developers/webhooks/verify-hmac-signatures/
