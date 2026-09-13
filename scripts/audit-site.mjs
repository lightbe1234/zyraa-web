import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const base = process.argv[2] || 'http://localhost:3000';
const env = { ...process.env, ...parseEnv(readFileSync('.env.local', 'utf8')) };
const out = `outputs/audit/${new URL(base).hostname}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const catalog = await (await fetch(base + '/api/products')).json();
const config = await (await fetch(base + '/api/store-config')).json();
const paths = ['/', '/collections', ...config.collections.map(c => '/collections/' + c.slug),
  ...catalog.map(p => '/products/' + p.slug), '/customise-your-shirt', '/cart', '/checkout',
  '/track-order', '/pages/contact', '/pages/shipping', '/pages/returns', '/pages/privacy', '/pages/terms', '/admin'];
const results = [];
for (const path of Array.from(new Set(paths))) {
  try {
    const start = Date.now();
    const response = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('body').waitFor();
    const detail = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 2,
      heading: document.querySelector('h1')?.textContent,
      brokenImages: Array.from(document.images).filter(i => i.complete && !i.naturalWidth && i.src).map(i => i.getAttribute('src')),
    }));
    results.push({ path, status: response.status(), elapsedMs: Date.now() - start, ...detail });
  } catch (e) { results.push({ path, error: e.message }); }
}
await page.goto(base + '/admin');
const login = await context.request.post(base + '/api/admin/session', { headers: { origin: base }, data: { email: env.ZYRA_ADMIN_EMAIL, password: env.ZYRA_ADMIN_PASSWORD } });
const admin = { loginStatus: login.status(), endpoints: [] };
if (login.ok()) {
  for (const endpoint of ['products', 'orders', 'settings', 'content', 'collections', 'home-collection-cards', 'custom-shirts', 'payment-setup']) {
    const r = await context.request.get(base + '/api/admin/' + endpoint);
    admin.endpoints.push({ endpoint, status: r.status() });
  }
  await page.reload();
  await page.screenshot({ path: `${out}/admin-mobile.png`, fullPage: true });
}
writeFileSync(`${out}/baseline.json`, JSON.stringify({ base, results, errors, admin }, null, 2));
console.log(JSON.stringify({ base, pages: results.length, failures: results.filter(r => r.status !== 200 || r.overflow || r.brokenImages?.length), errors, admin }, null, 2));
await browser.close();
