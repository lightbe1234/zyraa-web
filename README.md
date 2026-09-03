# ZYRA Commerce Demo

An original, responsive streetwear ecommerce store with a Supabase-backed catalog, search and filters, 1–4 image product galleries, product variants, cart, server-priced checkout, COD/bank-transfer order confirmation, tracking, customer forms, and a secured admin panel.

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

## Admin

Open `/admin/login` and sign in with the credentials configured through `ZYRA_ADMIN_EMAIL` and `ZYRA_ADMIN_PASSWORD`. Products, image galleries, collection names and collection cover images are managed from the Products tab.

## Environment

Copy `.env.example` to `.env.local` and configure the Supabase, admin-session and site URL variables. Never commit real credentials.

## Architecture

- Next.js App Router and React Server Components with a focused client storefront shell.
- Integer minor units for all prices.
- Browser persistence stores only variant identifiers and quantities; prices are reloaded from the catalog.
- `/api/orders` validates variants, stock, contact fields, payment mode and idempotency, then recalculates totals server-side.
- Local, replaceable campaign and product imagery; no reference-site assets or brand content.

See `docs/architecture.md` and `docs/admin-guide.md` for the production hardening path.
