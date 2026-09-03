alter table public.orders
  alter column public_token set default replace(gen_random_uuid()::text, '-', '');

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

  v_number := 'ZY-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
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

revoke all on function public.create_order(jsonb,jsonb,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.create_order(jsonb,jsonb,jsonb,text,text) to service_role;
