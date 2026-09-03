create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 160),
  category text not null,
  collection text not null,
  price integer not null check (price >= 0),
  compare_at integer check (compare_at is null or compare_at >= price),
  image text not null,
  alternate text not null,
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  reviews integer not null default 0 check (reviews >= 0),
  stock integer not null default 0 check (stock >= 0),
  colors text[] not null check (cardinality(colors) > 0),
  sizes text[] not null check (cardinality(sizes) > 0),
  featured boolean not null default false,
  new_arrival boolean not null default false,
  active boolean not null default true,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  singleton boolean primary key default true check (singleton),
  store_name text not null default 'ZYRA',
  support_email text not null default 'hello@zyra.store',
  free_shipping_threshold integer not null default 499900 check (free_shipping_threshold >= 0),
  flat_shipping integer not null default 25000 check (flat_shipping >= 0),
  bank_transfer_instructions text not null default 'Use your order number as the payment reference.',
  updated_at timestamptz not null default now()
);

insert into public.store_settings (singleton) values (true)
on conflict (singleton) do nothing;

create table if not exists public.content_sections (
  key text primary key check (key ~ '^[a-z0-9-]+$'),
  label text not null,
  sort_order integer not null check (sort_order >= 0),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.content_sections (key, label, sort_order) values
  ('campaign-hero', 'Campaign hero', 1),
  ('best-sellers', 'Best sellers', 2),
  ('brand-manifesto', 'Brand manifesto', 3),
  ('core-forms', 'Core forms', 4),
  ('collection-grid', 'Collection grid', 5),
  ('customer-reviews', 'Customer reviews', 6)
on conflict (key) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  order_number text not null unique,
  idempotency_key text not null unique,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  city text not null,
  province text not null,
  postal text not null default '',
  customer_note text not null default '',
  payment_method text not null check (payment_method in ('cod', 'bank')),
  status text not null check (status in ('PENDING','CONFIRMED','PROCESSING','PACKED','SHIPPED','DELIVERED','RETURN_REQUESTED','RETURNED','CANCELLED')),
  subtotal integer not null check (subtotal >= 0),
  shipping integer not null check (shipping >= 0),
  total integer not null check (total = subtotal + shipping),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_slug text not null,
  product_name text not null,
  size text not null,
  color text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_price integer not null check (unit_price >= 0),
  line_total integer not null check (line_total = unit_price * quantity)
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.api_rate_limits (
  scope text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (scope, key_hash, window_start)
);

create index if not exists products_active_category_idx on public.products (category, slug) where active;
create index if not exists products_featured_idx on public.products (featured, slug) where active;
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists audit_events_created_at_idx on public.audit_events (created_at desc);
create index if not exists api_rate_limits_window_idx on public.api_rate_limits (window_start);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function private.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function private.set_updated_at();

drop trigger if exists settings_set_updated_at on public.store_settings;
create trigger settings_set_updated_at before update on public.store_settings
for each row execute function private.set_updated_at();

drop trigger if exists content_set_updated_at on public.content_sections;
create trigger content_set_updated_at before update on public.content_sections
for each row execute function private.set_updated_at();

create or replace function public.consume_api_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.api_rate_limits (scope, key_hash, window_start, request_count)
  values (p_scope, p_key_hash, v_window, 1)
  on conflict (scope, key_hash, window_start)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_count;
  delete from public.api_rate_limits where window_start < now() - interval '2 days';
  return v_count <= p_limit;
end;
$$;

create or replace function public.create_order(
  p_items jsonb,
  p_customer jsonb,
  p_delivery jsonb,
  p_payment text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_item record;
  v_product public.products%rowtype;
  v_subtotal integer := 0;
  v_shipping integer;
  v_threshold integer;
  v_flat_shipping integer;
  v_number text;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) < 12 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'INVALID_ITEMS'; end if;
  if p_payment not in ('cod', 'bank') then raise exception 'INVALID_PAYMENT'; end if;
  if coalesce(p_customer->>'firstName','') = '' or coalesce(p_customer->>'lastName','') = '' or coalesce(p_customer->>'email','') = '' or coalesce(p_customer->>'phone','') = '' then raise exception 'INVALID_CUSTOMER'; end if;
  if coalesce(p_delivery->>'address','') = '' or coalesce(p_delivery->>'city','') = '' or coalesce(p_delivery->>'province','') = '' then raise exception 'INVALID_DELIVERY'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  select id into v_order_id from public.orders where idempotency_key = p_idempotency_key;
  if v_order_id is not null then return v_order_id; end if;

  perform 1 from public.products
  where slug in (select value->>'slug' from jsonb_array_elements(p_items))
  order by slug for update;

  v_number := 'ZY-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  insert into public.orders (
    order_number, idempotency_key, first_name, last_name, email, phone,
    address, city, province, postal, customer_note, payment_method, status,
    subtotal, shipping, total
  ) values (
    v_number, p_idempotency_key, trim(p_customer->>'firstName'), trim(p_customer->>'lastName'),
    lower(trim(p_customer->>'email')), trim(p_customer->>'phone'), trim(p_delivery->>'address'),
    trim(p_delivery->>'city'), trim(p_delivery->>'province'), trim(coalesce(p_delivery->>'postal','')),
    trim(coalesce(p_delivery->>'note','')), p_payment,
    case when p_payment = 'cod' then 'CONFIRMED' else 'PENDING' end,
    0, 0, 0
  ) returning id into v_order_id;

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(slug text, size text, color text, qty integer)
  loop
    if v_item.qty is null or v_item.qty < 1 or v_item.qty > 10 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products where slug = v_item.slug and active for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
    if not (v_item.size = any(v_product.sizes)) or not (v_item.color = any(v_product.colors)) then raise exception 'INVALID_VARIANT'; end if;
    if v_product.stock < v_item.qty then raise exception 'INSUFFICIENT_STOCK'; end if;
    insert into public.order_items (order_id, product_id, product_slug, product_name, size, color, quantity, unit_price, line_total)
    values (v_order_id, v_product.id, v_product.slug, v_product.name, v_item.size, v_item.color, v_item.qty, v_product.price, v_product.price * v_item.qty);
    update public.products set stock = stock - v_item.qty where id = v_product.id;
    v_subtotal := v_subtotal + (v_product.price * v_item.qty);
  end loop;

  select free_shipping_threshold, flat_shipping into v_threshold, v_flat_shipping from public.store_settings where singleton;
  v_shipping := case when v_subtotal >= v_threshold then 0 else v_flat_shipping end;
  update public.orders set subtotal = v_subtotal, shipping = v_shipping, total = v_subtotal + v_shipping where id = v_order_id;
  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values ('storefront', 'order.created', 'order', v_order_id::text, jsonb_build_object('order_number', v_number));
  return v_order_id;
end;
$$;

create or replace function public.admin_update_order_status(p_order_number text, p_status text, p_actor_email text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_allowed boolean;
begin
  select * into v_order from public.orders where order_number = p_order_number for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  v_allowed := case v_order.status
    when 'PENDING' then p_status in ('CONFIRMED','CANCELLED')
    when 'CONFIRMED' then p_status in ('PROCESSING','CANCELLED')
    when 'PROCESSING' then p_status in ('PACKED','CANCELLED')
    when 'PACKED' then p_status in ('SHIPPED','CANCELLED')
    when 'SHIPPED' then p_status in ('DELIVERED','RETURN_REQUESTED')
    when 'DELIVERED' then p_status = 'RETURN_REQUESTED'
    when 'RETURN_REQUESTED' then p_status = 'RETURNED'
    else false
  end;
  if not v_allowed then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  update public.orders set status = p_status where id = v_order.id;
  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values (p_actor_email, 'order.status_changed', 'order', v_order.id::text, jsonb_build_object('from', v_order.status, 'to', p_status));
  return v_order.id;
end;
$$;

create or replace function public.admin_upsert_product(p_product jsonb, p_original_slug text, p_actor_email text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_slug text := trim(p_product->>'slug');
begin
  if v_slug !~ '^[a-z0-9-]+$' then raise exception 'INVALID_SLUG'; end if;
  if p_original_slug is null then
    insert into public.products (slug,name,category,collection,price,compare_at,image,alternate,rating,reviews,stock,colors,sizes,featured,new_arrival,active,description)
    values (v_slug, trim(p_product->>'name'), trim(p_product->>'category'), trim(p_product->>'collection'), (p_product->>'price')::integer,
      nullif(p_product->>'compareAt','')::integer, trim(p_product->>'image'), trim(p_product->>'alternate'), coalesce((p_product->>'rating')::numeric,0),
      coalesce((p_product->>'reviews')::integer,0), (p_product->>'stock')::integer, array(select jsonb_array_elements_text(p_product->'colors')),
      array(select jsonb_array_elements_text(p_product->'sizes')), coalesce((p_product->>'featured')::boolean,false),
      coalesce((p_product->>'newArrival')::boolean,false), coalesce((p_product->>'active')::boolean,true), trim(p_product->>'description'))
    returning id into v_id;
  else
    update public.products set slug=v_slug, name=trim(p_product->>'name'), category=trim(p_product->>'category'), collection=trim(p_product->>'collection'),
      price=(p_product->>'price')::integer, compare_at=nullif(p_product->>'compareAt','')::integer, image=trim(p_product->>'image'), alternate=trim(p_product->>'alternate'),
      rating=coalesce((p_product->>'rating')::numeric,0), reviews=coalesce((p_product->>'reviews')::integer,0), stock=(p_product->>'stock')::integer,
      colors=array(select jsonb_array_elements_text(p_product->'colors')), sizes=array(select jsonb_array_elements_text(p_product->'sizes')),
      featured=coalesce((p_product->>'featured')::boolean,false), new_arrival=coalesce((p_product->>'newArrival')::boolean,false),
      active=coalesce((p_product->>'active')::boolean,true), description=trim(p_product->>'description')
    where slug = p_original_slug returning id into v_id;
    if v_id is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  end if;
  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values (p_actor_email, case when p_original_slug is null then 'product.created' else 'product.updated' end, 'product', v_id::text, jsonb_build_object('slug', v_slug));
  return v_id;
end;
$$;

create or replace function public.admin_patch_product(p_slug text, p_stock integer, p_active boolean, p_actor_email text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if p_stock is not null and p_stock < 0 then raise exception 'INVALID_STOCK'; end if;
  update public.products set stock=coalesce(p_stock,stock), active=coalesce(p_active,active) where slug=p_slug returning id into v_id;
  if v_id is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values (p_actor_email, 'product.patched', 'product', v_id::text, jsonb_build_object('stock',p_stock,'active',p_active));
  return v_id;
end;
$$;

create or replace function public.admin_update_settings(p_settings jsonb, p_actor_email text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.store_settings set
    store_name=trim(p_settings->>'storeName'), support_email=lower(trim(p_settings->>'supportEmail')),
    free_shipping_threshold=(p_settings->>'freeShippingThreshold')::integer,
    bank_transfer_instructions=trim(p_settings->>'bankTransferInstructions')
  where singleton;
  insert into public.audit_events (actor_email, action, entity_type, entity_id)
  values (p_actor_email, 'settings.updated', 'store_settings', 'singleton');
  return true;
end;
$$;

create or replace function public.admin_update_content(p_sections jsonb, p_actor_email text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_section record;
begin
  for v_section in select * from jsonb_to_recordset(p_sections) as x(key text, enabled boolean, "sortOrder" integer)
  loop
    update public.content_sections set enabled=v_section.enabled, sort_order=v_section."sortOrder" where key=v_section.key;
  end loop;
  insert into public.audit_events (actor_email, action, entity_type, entity_id)
  values (p_actor_email, 'content.updated', 'content_sections', 'all');
  return true;
end;
$$;

alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.content_sections enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.audit_events enable row level security;
alter table public.api_rate_limits enable row level security;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon, authenticated using (active);
drop policy if exists settings_public_read on public.store_settings;
create policy settings_public_read on public.store_settings for select to anon, authenticated using (true);
drop policy if exists content_public_read on public.content_sections;
create policy content_public_read on public.content_sections for select to anon, authenticated using (enabled);

revoke all on all tables in schema public from anon, authenticated;
grant select on public.products, public.store_settings, public.content_sections to anon, authenticated;
revoke all on function public.consume_api_rate_limit(text,text,integer,integer) from public, anon, authenticated;
revoke all on function public.create_order(jsonb,jsonb,jsonb,text,text) from public, anon, authenticated;
revoke all on function public.admin_update_order_status(text,text,text) from public, anon, authenticated;
revoke all on function public.admin_upsert_product(jsonb,text,text) from public, anon, authenticated;
revoke all on function public.admin_patch_product(text,integer,boolean,text) from public, anon, authenticated;
revoke all on function public.admin_update_settings(jsonb,text) from public, anon, authenticated;
revoke all on function public.admin_update_content(jsonb,text) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text,text,integer,integer) to service_role;
grant execute on function public.create_order(jsonb,jsonb,jsonb,text,text) to service_role;
grant execute on function public.admin_update_order_status(text,text,text) to service_role;
grant execute on function public.admin_upsert_product(jsonb,text,text) to service_role;
grant execute on function public.admin_patch_product(text,integer,boolean,text) to service_role;
grant execute on function public.admin_update_settings(jsonb,text) to service_role;
grant execute on function public.admin_update_content(jsonb,text) to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
