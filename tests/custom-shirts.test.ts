import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { customQuote, type CustomOption } from '../lib/custom-shirts.ts';

test('custom quotes reject inactive options and keep integer prices', () => {
  const options = ['colour','fabric','print'].map((kind,i)=>({id:kind,kind,price:[10000,149000,35000][i],active:true})) as CustomOption[];
  const ids={colour:'colour',fabric:'fabric',print:'print'};
  assert.equal(customQuote(options,ids),194000);
  assert.throws(()=>customQuote(options,{...ids,fabric:'unknown'}));
  options[0].active=false; assert.throws(()=>customQuote(options,ids));
});

test('custom orders freeze server prices and retain artwork and instructions transactionally', async()=>{
 const db=new PGlite();
 try {
  await db.exec('create role anon;create role authenticated;create role service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);');
  const initial=await readFile(new URL('../supabase/migrations/202609030001_initial_commerce.sql',import.meta.url),'utf8');
  await db.exec(initial.replace('create extension if not exists pgcrypto;','').replace("encode(gen_random_bytes(16), 'hex')","replace(gen_random_uuid()::text, '-', '')"));
  await db.exec(await readFile(new URL('../supabase/migrations/202609030003_portable_order_tokens.sql',import.meta.url),'utf8'));
  await db.exec('alter table products add column images text[];');
  await db.exec(await readFile(new URL('../supabase/migrations/202609100001_custom_shirts.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609100002_custom_shirt_two_sided_art.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609100003_custom_shirt_positions.sql',import.meta.url),'utf8'));
  await assert.rejects(db.query("select create_custom_shirt_design('black','cotton','front','M','','missing.png')"),/INVALID_ARTWORK/);
  await db.exec("insert into storage.objects values('custom-artwork','front.png'),('custom-artwork','back.png');");
  await assert.rejects(db.query("select create_custom_shirt_design('blue','cotton','both','M','Centre the print',$1) as slug",[JSON.stringify({front:'front.png',back:null})]),/BACK_ARTWORK_REQUIRED/);
  const slug=(await db.query<{slug:string}>("select create_custom_shirt_design('blue','cotton','both','front-centre','back-centre','M','Centre the print',$1) as slug",[JSON.stringify({front:'front.png',back:'back.png'})])).rows[0].slug;
  await db.exec("update custom_shirt_options set price=199000 where id='cotton';");
  const customer={firstName:'Test',lastName:'Fixture',email:'test@example.invalid',phone:'0000000000'};
  const id=(await db.query<{id:string}>("select create_order($1::jsonb,$2::jsonb,$3::jsonb,'cod','custom-test-order') as id",[JSON.stringify([{slug,size:'M',color:'Blue',qty:1,unitPrice:1}]),JSON.stringify(customer),JSON.stringify({address:'Test fixture',city:'Test',province:'Test'})])).rows[0].id;
  const item=(await db.query<{unit_price:number;custom_details:{instructions:string;artwork:string;frontArtwork:string;backArtwork:string}}>('select unit_price,custom_details from order_items where order_id=$1',[id])).rows[0];
  assert.equal(item.unit_price,224000);
  assert.equal(item.custom_details.frontArtwork,'front.png');
  assert.equal(item.custom_details.backArtwork,'back.png');
  assert.equal(item.custom_details.instructions,'Centre the print');
  assert.equal(item.custom_details.frontPosition,'Centre chest');
  assert.equal(item.custom_details.backPosition,'Centre back');
  await db.query("update custom_shirt_designs set expires_at=now()-interval '1 hour' where slug=$1",[slug]);
  await assert.rejects(db.query("select create_order($1::jsonb,$2::jsonb,$3::jsonb,'cod','custom-expired-order')",[JSON.stringify([{slug,size:'M',color:'Blue',qty:1}]),JSON.stringify(customer),JSON.stringify({address:'Test',city:'Test',province:'Test'})]),/CUSTOM_DESIGN_EXPIRED/);
  assert.equal((await db.query<{n:number}>('select count(*)::int n from orders')).rows[0].n,1);
 } finally {await db.close();}
});
