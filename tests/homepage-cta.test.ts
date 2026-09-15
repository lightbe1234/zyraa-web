import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const readProjectFile = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage CTA routes Shop the drop to all collections, including the legacy stored link', async () => {
  const [storefront, store] = await Promise.all([
    readProjectFile('app/storefront-app.tsx'),
    readProjectFile('lib/supabase-store.ts'),
  ]);

  assert.match(storefront, /heroCtaHref: '\/collections',/);
  assert.match(store, /data\.hero_cta_href === '\/collections\/after-hours' \? '\/collections'/);
});

test('homepage CTA migration updates only the legacy link and changes the database default', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.store_settings (
        id integer generated always as identity primary key,
        hero_cta_href text not null default '/collections/after-hours'
      );
      insert into public.store_settings (hero_cta_href)
      values ('/collections/after-hours'), ('/collections/summer-edit');
    `);
    await db.exec(await readProjectFile('supabase/migrations/202609150001_homepage_cta_all_collections.sql'));
    await db.exec('insert into public.store_settings default values;');

    const result = await db.query<{ hero_cta_href: string }>(
      'select hero_cta_href from public.store_settings order by id',
    );
    assert.deepEqual(result.rows.map((row) => row.hero_cta_href), [
      '/collections',
      '/collections/summer-edit',
      '/collections',
    ]);
  } finally {
    await db.close();
  }
});
