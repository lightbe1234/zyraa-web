import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('payment migrations enforce totals, stock, duplicate callbacks and fulfilment rules', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role;');
    // PGlite lacks pgcrypto. Token default is replaced by the same core UUID
    // expression used in our portable-token migration; payment SQL is unchanged.
    const initial = await readFile(new URL('../supabase/migrations/202609030001_initial_commerce.sql', import.meta.url), 'utf8');
    await db.exec(initial.replace('create extension if not exists pgcrypto;', '').replace("encode(gen_random_bytes(16), 'hex')", "replace(gen_random_uuid()::text, '-', '')"));
    for (const name of ['202609030002_restock_terminal_orders.sql','202609030003_portable_order_tokens.sql','202609070001_safepay.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));
    await db.exec(`insert into products(slug,name,category,collection,price,image,alternate,stock,colors,sizes,description) values ('test-tee','Test tee','Test','test',100000,'/test.jpg','/test.jpg',5,array['Black'],array['M'],'Test fixture');`);
    const create = async (key:string) => (await db.query<{id:string}>(`select create_safepay_order($1::jsonb,$2::jsonb,$3::jsonb,'safepay',$4) as id`, [JSON.stringify([{slug:'test-tee',size:'M',color:'Black',qty:1,unitPrice:1}]),JSON.stringify({firstName:'Test',lastName:'Fixture',email:'test@example.invalid',phone:'0000000000'}),JSON.stringify({address:'Test fixture',city:'Test',province:'Test'}),key])).rows[0].id;
    const id = await create('test-checkout-key-1');
    assert.equal(await create('test-checkout-key-1'),id);
    const order = (await db.query<{public_token:string;total:number;order_number:string}>('select public_token,total,order_number from orders where id=$1',[id])).rows[0];
    assert.equal(order.total,125000);
    assert.equal((await db.query<{stock:number}>('select stock from products')).rows[0].stock,4);
    await assert.rejects(db.query(`select admin_update_order_status($1,'CONFIRMED','test')`,[order.order_number]),/PAYMENT_NOT_VERIFIED/);
    await db.query(`select claim_safepay($1,'sandbox')`,[order.public_token]);
    await assert.rejects(db.query(`select claim_safepay($1,'sandbox')`,[order.public_token]),/PAYMENT_INITIALIZING/);
    await db.query(`select attach_safepay($1,'track_test')`,[order.public_token]);
    await assert.rejects(db.query(`select confirm_safepay('evt_wrong','track_test',1,'PKR','sandbox')`),/PAYMENT_MISMATCH/);
    await assert.rejects(db.query(`select confirm_safepay('evt_wrong','track_test',125000,'USD','sandbox')`),/PAYMENT_MISMATCH/);
    await assert.rejects(db.query(`select confirm_safepay('evt_wrong','track_test',125000,'PKR','production')`),/PAYMENT_MISMATCH/);
    await db.query(`select confirm_safepay('evt_test','track_test',125000,'PKR','sandbox')`);
    await db.query(`select confirm_safepay('evt_test','track_test',125000,'PKR','sandbox')`);
    assert.deepEqual((await db.query('select status,payment_status from orders where id=$1',[id])).rows[0],{status:'CONFIRMED',payment_status:'PAID'});
    assert.equal((await db.query<{count:number}>('select count(*)::integer as count from safepay_events')).rows[0].count,1);
    await db.query(`select admin_update_order_status($1,'CANCELLED','test')`,[order.order_number]);
    await db.query(`select confirm_safepay('evt_late','track_test',125000,'PKR','sandbox')`);
    assert.deepEqual((await db.query('select status,payment_status from orders where id=$1',[id])).rows[0],{status:'CANCELLED',payment_status:'PAID_REVIEW_REQUIRED'});
    assert.equal((await db.query<{stock:number}>('select stock from products')).rows[0].stock,5);
  } finally { await db.close(); }
});
