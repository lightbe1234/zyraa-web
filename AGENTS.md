# ZYRA editing guide

## Commands

- `pnpm dev` — local site
- `pnpm typecheck` — strict TypeScript
- `pnpm test` — domain tests
- `pnpm build` — deployment build

## Boundaries

- `lib/catalog.ts` owns seeded catalog records and integer prices.
- `lib/commerce.ts` owns server-authoritative pricing, stock checks, and status transitions.
- `app/storefront-app.tsx` owns the interactive demo flows and route views.
- `app/api/orders/route.ts` must ignore client-submitted prices and totals.
- `app/globals.css` owns shared design tokens and responsive behavior.

## Invariants

- Money is integer minor units; never use floating-point totals.
- Cart storage may contain only SKU/variant selections and quantity, never authoritative pricing.
- Never add real credentials, customer PII, or raw payment data to the repository.
- Preserve original ZYRA branding and local imagery; do not copy reference-site assets or copy.
- Any production mutation must add server authorization, CSRF/origin checks, rate limits, audit events, and durable database transactions.
