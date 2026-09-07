# Visitor activity (local)

Admin → visitors displays anonymous sessions, public page views, successful bag additions and checkout views. Activity starts automatically without a permission popup and is disclosed at `/pages/privacy`, with a browser opt-out control. Previous declines, Do Not Track and Global Privacy Control are respected. Browser-reported events are not verified purchases. Admin sessions are excluded server-side. The checkout URL is recorded without query strings; order tokens, contact details, search terms, raw user agents and IP addresses are not stored.

Data persists in ignored `data/visitor-activity.sqlite`. Events expire after 30 days on the next read/write. The signed HttpOnly visitor cookie expires after 30 minutes of inactivity. Dashboard reads require the existing admin session; event writes require the same origin and are rate limited transactionally. A new privacy choice stops future analytics; existing records expire under retention.

This requested localhost implementation is disabled in production. Before deploying this module, migrate storage and rate limiting to Supabase transactions with service-only permissions and audit events. Do not use SQLite on Vercel. Localhost cannot provide a reliable public visitor IP, so the dashboard labels it unavailable. Nothing was deployed or pushed as part of this change.
