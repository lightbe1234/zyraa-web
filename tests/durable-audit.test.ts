import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('durable details, verified reviews, concurrent editing and notification claims', async () => {
  const db = new PGlite();
  const migration = async (name: string) => readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8');
  try {
    await db.exec('create role anon; create role authenticated; create role service_role;');
    await db.exec((await migration('202609030001_initial_commerce.sql')).replace('create extension if not exists pgcrypto;', '').replace("encode(gen_random_bytes(16), 'hex')", "replace(gen_random_uuid()::text, '-', '')"));
    await db.exec(await migration('202609030003_portable_order_tokens.sql'));
    await db.exec('create table store_collections(slug text primary key, name text,image text);create table home_collection_cards(collection_slug text references store_collections(slug));');
    await db.exec(await migration('202609040002_multi_product_and_collection_images.sql'));
    for (const name of ['202609130001_durable_product_experience.sql','202609130003_product_presence.sql','202609130004_product_edit_concurrency.sql','202609130005_order_notifications.sql']) await db.exec(await migration(name));
    const p = { slug: 'audit-tee', name: 'Audit tee', category: 'Tees', collection: 'Tees', price: 200000, images: ['/test.jpg'], stock: 5, colors: ['Black'], sizes: ['M'], description: 'Fixture' };
    await db.query('select admin_save_product_checked($1::jsonb,null,$2)', [JSON.stringify(p), 'test-admin']);
    await db.query('select save_product_details($1,$2::jsonb,$3)', [p.slug, JSON.stringify({ material: 'Cotton', measurements: [] }), 'test-admin']);
    assert.equal((await db.query<{n:number}>('select count(*)::integer n from product_details')).rows[0].n, 1);
    const version = (await db.query<{v:string}>('select updated_at::text v from products where slug=$1', [p.slug])).rows[0].v;
    const items = JSON.stringify([{ slug: p.slug, color: 'Black', size: 'M', qty: 1 }]);
    const customer = JSON.stringify({firstName:'Test',lastName:'Fixture',email:'test@example.invalid',phone:'0000000000'});
    const delivery = JSON.stringify({address:'Test',city:'Test',province:'Test'});
    const id = (await db.query<{id:string}>("select create_order($1::jsonb,$2::jsonb,$3::jsonb,'cod','audit-test-order-key') id", [items,customer,delivery])).rows[0].id;
    await assert.rejects(db.query('select admin_save_product_checked($1::jsonb,$2,$3)', [JSON.stringify({...p,updatedAt:version}), p.slug,'test-admin']), /PRODUCT_CHANGED/);
    const order = (await db.query<{public_token:string;order_number:string}>('select public_token,order_number from orders where id=$1',[id])).rows[0];
    await assert.rejects(db.query('select add_product_review($1,$2,5,$3)',[p.slug,order.public_token,'A review from a test fixture.']), /DELIVERED_ORDER_REQUIRED/);
    await db.query("update orders set status='DELIVERED' where id=$1",[id]);
    await db.query('select add_product_review($1,$2,5,$3)',[p.slug,order.public_token,'A review from a test fixture.']);
    await assert.rejects(db.query('select add_product_review($1,$2,5,$3)',[p.slug,order.public_token,'A repeated test fixture review.']), /unique/);
    const claim = async () => (await db.query<{ok:boolean}>('select claim_order_notification($1) ok',[order.order_number])).rows[0].ok;
    assert.equal(await claim(),true); assert.equal(await claim(),false);
    await db.query('select finish_order_notification($1,true)',[order.order_number]);
    assert.equal(await claim(),false);
    const beat = async (hash: string) => (await db.query<{n:number}>('select product_heartbeat($1,$2) n',[p.slug,hash])).rows[0].n;
    assert.equal(await beat('a'.repeat(64)),1); assert.equal(await beat('a'.repeat(64)),1); assert.equal(await beat('b'.repeat(64)),2);
    await db.exec("update product_presence set seen_at=now()-interval '3 minutes'");
    assert.equal(await beat('a'.repeat(64)),1);
  } finally { await db.close(); }
});
