# Admin guide

1. Open `/admin/login` and start a demo session with any valid email and an 8+ character password.
2. Dashboard shows seeded performance, open-order, and low-stock summaries.
3. Products lets you adjust demo inventory per SKU; zero stock immediately changes its status.
4. Orders exposes status selectors for the seeded order queue.
5. Content lets you enable or disable homepage sections and save the demo order.
6. Settings edits store identity, contact details, shipping threshold, and bank instructions for the current demo session.

For production, admin sessions must use the authorization and audit controls in `docs/architecture.md`. Every inventory adjustment requires a reason and an immutable stock-movement row; every order or payment transition requires actor, timestamp and prior/new state.
