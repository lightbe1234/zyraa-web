# Product page preview

Run `pnpm dev` and open http://localhost:3000/products/let-him-cook.

The product catalog, prices, stock and store shipping settings are read from the existing catalog. No production data or migrations were changed for this work.

## Supplemental content and genuine activity

`data/product-experience.sqlite` is an ignored, development-only database. It stores the product-specific summary, fabric, fit, care and measurement records, verified reviews, short-lived viewer sessions and audit records. Restarting the dev server preserves reviews and content.

In the admin product editor, open **Product page content & size guide · local preview**. Use **Save local page details** to save the supplemental fields without saving the live product form. Enter actual garment measurements in cm, measured flat. No measurements or fabric claims are guessed when these fields are blank.

Reviews require an existing delivered order containing the product and a matching checkout email/phone. The server checks the existing order read-only; one review per order/product is allowed. The public response contains no order number, contact or verification proof. No seeded community reviews are used on the product page.

The eye indicator counts signed browser sessions seen in the past 60 seconds, with a heartbeat every 25 seconds from visible tabs. Duplicate tabs share a cookie. It describes browser visits, not identifiable people. If tracking fails, the indicator hides. There is no random count.

## Before a later production release

The supplemental store is explicitly disabled in production and on non-loopback hosts. Do not deploy this SQLite file to Vercel or assume its data synchronizes with Supabase. A future release must migrate the supplemental content/reviews into Supabase and use durable shared presence and rate-limit storage, preserving the same authorization, origin checks, order verification and audit transactions. Until that integration is done, production hides the viewer count and review form and uses safe content fallbacks.

## Checks

`pnpm typecheck`, `pnpm test`, and `pnpm build`.

Check mobile gallery swipe, zoom/close/Escape, size validation, stock limits including the cart, Add to bag, Buy now persistence, and the sticky CTA after the main controls scroll out of view. Never place a real order as part of preview checks.
