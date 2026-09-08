import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';

function adminCookie() {
  const payload = Buffer.from(JSON.stringify({email:process.env.ZYRA_ADMIN_EMAIL!.trim().toLowerCase(),exp:Date.now()+300000})).toString('base64url');
  return `${payload}.${createHmac('sha256',process.env.ZYRA_SESSION_SECRET!).update(payload).digest('base64url')}`;
}

test.beforeEach(async ({context,page,request}) => {
  const response = await request.get('/api/products');
  const catalog = await response.json();
  const product = catalog.find((p: {stock:number}) => p.stock > 0);
  await context.addInitScript((item) => localStorage.setItem('zyra-cart',JSON.stringify([item])),{slug:product.slug,size:product.sizes[0],color:product.colors[0],qty:1});
  // Browser checkout tests cannot create real orders or pollute visitor counts.
  await page.route('**/api/orders*',route => route.fulfill({status:503,json:{error:'Isolated checkout test'}}));
  await page.route('**/api/visitor-activity*',route => route.fulfill({status:204}));
});

test('mobile and desktop expose billing and unavailable advance payment honestly', async ({page}) => {
  for (const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/checkout');
    await expect(page.getByText('04 / Billing & payment')).toBeVisible();
    await expect(page.getByText('Advance card payment · Safepay')).toBeVisible();
    await expect(page.getByText('Currently unavailable.',{exact:false})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => page.locator('.checkout-line img').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),{timeout:20000}).toBe(true);
    await page.screenshot({path:`outputs/checkout-${width}.png`,fullPage:true});
  }
});

test('card order survives reload and payment initialization failure without duplicating order', async ({page}) => {
  await page.route('**/api/payments/safepay',route => route.request().method()==='GET' ? route.fulfill({json:{available:true,environment:'sandbox'}}) : route.fulfill({status:503,json:{error:'Payment unavailable — isolated test'}}));
  let orders=0;
  await page.route('**/api/orders',route => { orders++;return route.fulfill({status:201,json:{token:'isolated_test_order_123456789',payment:'safepay'}}); });
  await page.goto('/checkout');
  for (const [name,value] of Object.entries({email:'test@example.invalid',phone:'00000000000',firstName:'Test',lastName:'Fixture',address:'Test only',city:'Test'})) await page.locator(`[name="${name}"]`).fill(value);
  await page.getByRole('radio',{name:/Debit \/ credit card/}).check();
  await page.getByRole('button',{name:/Continue to secure payment/}).click();
  await expect(page.getByRole('heading',{name:'Finish your payment.'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Finish your payment.'})).toBeVisible();
  expect(orders).toBe(1);
});

test('admin preview records an actual browser page view and is visible in dashboard', async ({context,page}) => {
  test.skip(!process.env.ZYRA_SESSION_SECRET || !process.env.ZYRA_ADMIN_EMAIL,'Admin session configuration needed');
  const payload=Buffer.from(JSON.stringify({email:process.env.ZYRA_ADMIN_EMAIL!.trim().toLowerCase(),exp:Date.now()+300000})).toString('base64url');
  const signature=createHmac('sha256',process.env.ZYRA_SESSION_SECRET!).update(payload).digest('base64url');
  await context.addCookies([{name:'zyra_admin_session',value:`${payload}.${signature}`,url:'http://localhost:3000',httpOnly:true,sameSite:'Strict'}]);
  await page.unroute('**/api/visitor-activity*');
  const activity = page.waitForResponse(response => response.url().includes('/api/visitor-activity') && response.request().method()==='POST');
  await page.goto('/collections');
  expect((await activity).status()).toBe(204);
  // Do not display real order customer details in this test browser.
  await page.route('**/api/admin/orders',route => route.fulfill({json:[]}));
  await page.goto('/admin');
  await page.getByRole('button',{name:'visitors',exact:true}).click();
  await page.getByRole('button',{name:'Admin preview',exact:true}).click();
  await expect(page.getByText('Admin preview only',{exact:false})).toBeVisible();
  await expect(page.locator('.visitor-timeline').getByText('/collections',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'payments',exact:true}).click();
  await expect(page.getByText('Not active —',{exact:false})).toBeVisible();
});

test('homepage editorial cards use their own database content and appear in Products admin', async ({context,page,request}) => {
  test.skip(!process.env.ZYRA_SESSION_SECRET || !process.env.ZYRA_ADMIN_EMAIL,'Admin session configuration needed');
  const configResponse = await request.get('/api/store-config');
  expect(configResponse.ok()).toBe(true);
  const config = await configResponse.json() as {homeCollectionCards:Array<{title:string;image:string;collectionSlug:string;enabled:boolean}>};
  const visibleCards = config.homeCollectionCards.filter((card) => card.enabled);
  expect(visibleCards.length).toBeGreaterThanOrEqual(2);

  await page.setViewportSize({width:390,height:900});
  await page.goto('/');
  const homepageCards = page.locator('.editorial-grid > a');
  await expect(homepageCards).toHaveCount(visibleCards.length);
  await expect(homepageCards.first().getByRole('heading')).toHaveText(visibleCards[0].title);
  await expect(homepageCards.first().locator('img')).toHaveAttribute('src', visibleCards[0].image);
  await expect(homepageCards.first()).toHaveAttribute('href', `/collections/${visibleCards[0].collectionSlug}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await context.addCookies([{name:'zyra_admin_session',value:adminCookie(),url:'http://localhost:3000',httpOnly:true,sameSite:'Strict'}]);
  await page.route('**/api/admin/orders',route => route.fulfill({json:[]}));
  await page.goto('/admin');
  await page.getByRole('button',{name:'products',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Homepage collection cards'})).toBeVisible();
  await expect(page.locator('.admin-home-card')).toHaveCount(config.homeCollectionCards.length);
  await expect(page.locator('.admin-home-card').first().getByLabel('Display name')).toHaveValue(config.homeCollectionCards[0].title);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('anonymous customer page views reach the customer dashboard', async ({context,page,request}) => {
  test.skip(!process.env.ZYRA_SESSION_SECRET || !process.env.ZYRA_ADMIN_EMAIL,'Admin configuration needed');
  await page.unroute('**/api/visitor-activity*');
  let visitor = '';
  try {
    const recorded = page.waitForResponse(response => response.url().includes('/api/visitor-activity') && response.request().method()==='POST');
    await page.goto('/collections');
    expect((await recorded).status()).toBe(204);
    visitor = (await context.cookies()).find(cookie => cookie.name === 'zyra_activity')!.value.split('.')[0];
    const result = await request.get('/api/visitor-activity',{headers:{cookie:`zyra_admin_session=${adminCookie()}`}});
    const data = await result.json();
    expect(data.visitors.some((entry:{visitor:string}) => entry.visitor === visitor)).toBe(true);
    expect(data.events.some((entry:{visitor:string;path:string}) => entry.visitor === visitor && entry.path === '/collections')).toBe(true);
  } finally {
    // Remove only this isolated browser's test telemetry; preserve all other data.
    if (/^[a-f0-9-]{36}$/.test(visitor)) { const db = new DatabaseSync(join(process.cwd(),'data','visitor-activity.sqlite')); try { db.prepare('DELETE FROM events WHERE visitor=?').run(visitor); db.prepare('DELETE FROM limits WHERE key=?').run(visitor); } finally { db.close(); } }
  }
});

test('a return URL alone cannot mark payment paid; verified result does',async ({page}) => {
  let paid = false;
  await page.route('**/api/orders*',route => route.fulfill({json:{payment:'safepay',paymentStatus:paid ? 'PAID' : 'UNPAID',status:paid ? 'CONFIRMED' : 'PENDING',items:[]}}));
  await page.route('**/order-confirmation/**',route => route.fulfill({contentType:'text/html',body:'<h1>Verified order page test</h1>'}));
  await page.goto('/payment-return?order=isolated_test_order_123456789&paid=true');
  await expect(page.getByRole('heading',{name:/Payment is not yet confirmed/})).toBeVisible();
  expect(page.url()).toContain('/payment-return');
  paid=true;
  await expect(page.getByRole('heading',{name:'Verified order page test'})).toBeVisible({timeout:12000});
});
