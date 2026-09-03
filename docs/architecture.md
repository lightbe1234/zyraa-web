# Architecture and production path

## Current demo

The site is a Cloudflare-compatible Vinext modular monolith. Static catalog records live in `lib/catalog.ts`; reusable commerce rules live in `lib/commerce.ts`; all route surfaces use one client shell so cart state and overlays behave consistently. The order endpoint recalculates price, shipping, variant validity, stock and totals. An in-process idempotency map prevents duplicate creation during one runtime lifetime.

The local demo intentionally stores only cart identifiers, selected options and quantities in browser storage. Product prices remain catalog-authoritative. The last confirmation is retained locally so tracking can be demonstrated without collecting or transmitting real personal data.

## Production adapter

Before accepting real orders, replace the demo repositories with PostgreSQL/Prisma repositories using `prisma/schema.prisma` as the contract. In one database transaction: lock referenced variants, verify current price and stock, decrement stock with a non-negative constraint, create immutable order-item snapshots, addresses, payment and first status history entry, persist the idempotency key, then clear the cart. Dispatch email after commit.

Use Auth.js database sessions and Argon2id credentials for customers/admins, HttpOnly Secure SameSite cookies, CSRF/origin validation, constant-time login responses and rate limiting. Bootstrap the first admin from `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`, then unset both.

Use presigned uploads to S3-compatible storage. Validate extension, MIME, decoded image format and byte size; use random keys and record ownership/alt text in PostgreSQL. Add scheduled orphan cleanup.

## Deployment

The demo can deploy directly with Sites. A Vercel/PostgreSQL production variant should run migrations during a controlled release step, keep database backups, test restoration quarterly, and never run destructive schema changes without a verified backup.
