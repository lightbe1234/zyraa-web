import { test, expect } from '@playwright/test';

// Explicit opt-in: creates and immediately cancels one marked demonstration order.
test('custom shirt real upload, checkout and admin record', async ({ page, context }) => {
  test.skip(process.env.ZYRA_RUN_CUSTOM_DEMO !== '1', 'Only run with explicit demo-order authorization.');
  test.setTimeout(180000);
  const headers = { origin: 'http://localhost:3000' };
  const login = await context.request.post('/api/admin/session', { headers, data: { email: process.env.ZYRA_ADMIN_EMAIL, password: process.env.ZYRA_ADMIN_PASSWORD } });
  expect(login.status(), 'Admin login must work before placing a cancellable demo').toBe(200);
  let number = '';
  const note = 'DEMO ONLY - DO NOT PRINT OR DISPATCH. Front and back upload verification.';
  try {
    await page.goto('/customise-your-shirt', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Black', exact: false }).click();
    await page.getByRole('button', { name: 'Continue to fabric' }).click();
    await page.getByRole('button', { name: /Cotton/ }).first().click();
    await page.getByRole('button', { name: 'Continue to size & print' }).click();
    await page.getByRole('button', { name: 'M', exact: true }).click();
    await page.getByRole('button', { name: /Front \+ back/ }).click();
    await page.getByRole('button', { name: /Centre chest/ }).click();
    await page.getByRole('button', { name: /Centre back/ }).click();
    await page.getByRole('button', { name: 'Continue to your artwork' }).click();
    for (const side of ['front', 'back']) {
      const uploaded = page.waitForResponse(r => r.url().endsWith('/api/custom-shirts/upload') && r.request().method() === 'POST');
      await page.getByLabel(`Upload ${side} print`, { exact: true }).setInputFiles('public/street-wear.jpeg');
      expect((await uploaded).status()).toBe(201);
      await expect(page.getByAltText(`${side} artwork`)).toBeVisible();
    }
    await page.getByLabel('Print instructions', { exact: false }).fill(note);
    await page.getByRole('checkbox').check();
    let design: { price: number } | undefined;
    await page.route('**/api/custom-shirts/designs', async route => {
      const response = await route.fetch();
      const data = await response.json();
      expect(response.ok(), JSON.stringify(data.error)).toBe(true);
      design = data;
      await route.fulfill({ response });
    });
    await page.locator('.zs-next[type="submit"]').click();
    await expect(page).toHaveURL(/\/cart$/);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    for (const [name, value] of Object.entries({ email: 'custom-demo@example.invalid', phone: '00000000000', firstName: 'DEMO', lastName: 'DO NOT FULFIL', address: 'DEMO ONLY - DO NOT DISPATCH', city: 'Karachi', note })) {
      await page.locator(`[name="${name}"]`).fill(value);
    }
    await page.locator('select[name="province"]').selectOption('Sindh');
    await page.getByLabel('Cash on delivery', { exact: false }).check();
    let order: { subtotal: number } | undefined;
    await page.route('**/api/orders', async route => {
      const response = await route.fetch();
      const data = await response.json();
      number = data.number || '';
      order = data;
      expect(response.status(), JSON.stringify(data.error)).toBe(201);
      await route.fulfill({ response });
    });
    await page.getByRole('button', { name: /Place cash-on-delivery order/ }).click();
    await expect(page.getByText('Custom order · made for you', { exact: false }).first()).toBeVisible();
    expect(order!.subtotal).toBe(design!.price);
    const admin = await context.request.get('/api/admin/orders');
    expect(admin.ok()).toBe(true);
    const saved = (await admin.json()).find((o: { number: string }) => o.number === number);
    const details = saved.items[0].customDetails;
    expect(details.instructions).toBe(note);
    expect(details.frontArtwork).toBeTruthy();
    expect(details.backArtwork).toBeTruthy();
    expect(details.frontArtwork).not.toBe(details.backArtwork);
    for (const url of [details.frontImage, details.backImage]) expect((await context.request.get(url)).ok()).toBe(true);
    console.log(`Verified custom demo order ${number}: both artworks, server price, confirmation and admin record.`);
  } finally {
    if (number) {
      const cancelled = await context.request.patch('/api/admin/orders', { headers, data: { number, status: 'CANCELLED' } });
      expect(cancelled.ok(), 'Demo must not enter fulfilment').toBe(true);
      expect((await cancelled.json()).status).toBe('CANCELLED');
      console.log(`Demo ${number} cancelled; retained for admin inspection, not for fulfilment.`);
    }
  }
});
