import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';
const env = { ...process.env, ...parseEnv(readFileSync('.env.local', 'utf8')) };
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const tables = ['products', 'store_collections', 'home_collection_cards', 'store_settings', 'content_sections',
  'orders', 'order_items', 'audit_events', 'custom_shirt_options', 'custom_shirt_settings', 'custom_shirt_designs', 'safepay_payments'];
const folder = 'outputs/audit/database-' + new Date().toISOString().replaceAll(':', '-');
mkdirSync(folder, { recursive: true });
const summary = [];
for (const table of tables) {
  let rows = [];
  let error;
  for (let offset = 0; ; offset += 1000) {
    const result = await db.from(table).select('*').range(offset, offset + 999);
    if (result.error) { error = result.error.message; break; }
    rows.push(...result.data);
    if (result.data.length < 1000) break;
  }
  if (!error) writeFileSync(`${folder}/${table}.json`, JSON.stringify(rows));
  summary.push({ table, rows: rows.length, error });
}
const buckets = await db.storage.listBuckets();
const schema = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', { headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: 'Bearer ' + env.SUPABASE_SECRET_KEY, Accept: 'application/openapi+json' } });
writeFileSync(`${folder}/api-schema.json`, await schema.text());
writeFileSync(`${folder}/summary.json`, JSON.stringify({ project: new URL(env.NEXT_PUBLIC_SUPABASE_URL).host, summary, buckets: buckets.data }, null, 2));
console.log(JSON.stringify({ folder, summary, buckets: buckets.data?.map(b => ({ name: b.name, public: b.public, file_size_limit: b.file_size_limit })) }, null, 2));
