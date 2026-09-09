# ZYRA SEO release

Implemented per-product and per-collection metadata, canonical URLs, Open Graph/Twitter previews, server-rendered Product/Offer/Breadcrumb schema, Organization/WebSite schema, public help-page metadata, live catalog sitemap, and noindex for private utility routes. Unknown public routes return 404. Sitemap never substitutes seed records during a database outage. Google ownership verification tag is retained.

## Production checks

- Confirm NEXT_PUBLIC_SITE_URL is the final HTTPS production origin. The safe fallback is https://zyraa-web.vercel.app; migrate canonicals and Search Console when a custom domain is chosen.
- Include all public/catalog assets in the release. Product records can go live before their relative image files reach Vercel; those records then display broken images.
- Verify a product's rendered HTML includes its own title, canonical and Product schema. Verify a missing product returns 404, /admin has noindex, and sitemap includes active Supabase products and collections.
- After publishing, finish Google Search Console ownership verification, submit /sitemap.xml and inspect representative product/collection URLs. Run Google's Rich Results Test and mobile PageSpeed Insights on production.
- GA4 account creation and instrumentation are still pending. Do not claim conversion measurement until real ecommerce events have been verified.

## Content and keywords still requiring account/business data

Search Console and Keyword Planner have not yet supplied keyword volumes, competition or ranking baselines. Current metadata uses actual catalog names and category intent, not a validated keyword-volume map. Next: export Pakistan keyword research; map broad shopping terms to collections and specific design/colour/product terms to products; prioritize by demand, relevance, stock and organic conversions.

Verify fabric composition, GSM, fit and care for each product before enriching descriptions. Do not invent manufacturing claims, review ratings, GTINs, delivery promises or refund terms. The existing numeric catalog ratings are intentionally excluded from structured data because they are not verified customer review evidence. A size exchange is not automatically a refund policy.

Track indexed products, non-brand clicks, CTR, organic purchases and revenue after release. Search ranking and AI inclusion are not guaranteed by technical markup. Authority, customer evidence, product content, performance and ongoing query analysis remain part of the work.
