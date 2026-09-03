# ZYRA Commerce Demo

An original, responsive streetwear ecommerce demo inspired by the editorial rhythm of modern fashion storefronts. It includes a 24-product catalog, search and filters, product variants, cart, server-priced checkout, COD/bank-transfer order confirmation, tracking, customer forms, and an interactive admin prototype.

## Run locally

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

## Verification

```powershell
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Demo admin

Open `/admin/login`. In the local prototype, any valid email plus an 8+ character password starts an isolated browser-session demo. No credentials are transmitted or stored. This intentionally is not production authentication; use the production adapter plan in `docs/architecture.md` before handling real customers.

## Environment

Only `NEXT_PUBLIC_SITE_URL` is used by this hosted demo. The remaining variables in `.env.example` document the production Postgres, session, S3-compatible storage, email, and admin bootstrap contract.

## Architecture

- Vinext App Router and React Server Components with a focused client storefront shell.
- Integer minor units for all prices.
- Browser persistence stores only variant identifiers and quantities; prices are reloaded from the catalog.
- `/api/orders` validates variants, stock, contact fields, payment mode and idempotency, then recalculates totals server-side.
- Local, replaceable campaign and product imagery; no reference-site assets or brand content.

See `docs/architecture.md` and `docs/admin-guide.md` for the production hardening path.
