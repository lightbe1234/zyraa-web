-- Apply before enabling SAFEPAY_ENABLED. All payment writes are service-only.
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check(payment_method in ('cod','bank','safepay'));
alter table public.orders add column if not exists payment_status text not null default 'UNPAID';
create table public.safepay_payments (
  order_id uuid primary key references public.orders(id),
  tracker text unique,
  environment text not null check(environment in ('sandbox','production')),
  amount integer not null check(amount > 0),
  currency text not null default 'PKR' check(currency='PKR'),
  status text not null default 'CREATING',
  created_at timestamptz not null default now()
);
create table public.safepay_events(event_id text primary key, tracker text not null, kind text not null, created_at timestamptz not null default now());
alter table public.safepay_payments enable row level security;
alter table public.safepay_events enable row level security;
revoke all on public.safepay_payments, public.safepay_events from anon, authenticated;
grant all on public.safepay_payments, public.safepay_events to service_role;

create function public.create_safepay_order(p_items jsonb,p_customer jsonb,p_delivery jsonb,p_payment text,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_order public.orders%rowtype;
begin
  if p_payment <> 'safepay' then raise exception 'INVALID_PAYMENT'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key,0));
  select * into v_order from orders where idempotency_key=p_idempotency_key;
  if found then
    if v_order.payment_method <> 'safepay' then raise exception 'INVALID_PAYMENT'; end if;
    return v_order.id;
  end if;
  v_id := public.create_order(p_items,p_customer,p_delivery,'bank',p_idempotency_key);
  update orders set payment_method='safepay',payment_status='UNPAID' where id=v_id;
  insert into audit_events(actor_email,action,entity_type,entity_id) values('storefront','payment.requested','order',v_id::text);
  return v_id;
end; $$;

create function public.claim_safepay(p_token text,p_environment text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders%rowtype; p public.safepay_payments%rowtype;
begin
  select * into o from orders where public_token=p_token for update;
  if not found or o.payment_method <> 'safepay' or o.status <> 'PENDING' or o.payment_status <> 'UNPAID' or o.total < 1 then raise exception 'PAYMENT_UNAVAILABLE'; end if;
  select * into p from safepay_payments where order_id=o.id;
  if found then
    if p.environment <> p_environment then raise exception 'ENVIRONMENT_MISMATCH'; end if;
    if p.tracker is null then raise exception 'PAYMENT_INITIALIZING'; end if;
    return jsonb_build_object('create',false,'tracker',p.tracker,'amount',p.amount,'number',o.order_number);
  end if;
  insert into safepay_payments(order_id,amount,environment) values(o.id,o.total,p_environment);
  insert into audit_events(actor_email,action,entity_type,entity_id) values('storefront','payment.session_claimed','order',o.id::text);
  return jsonb_build_object('create',true,'amount',o.total,'number',o.order_number);
end; $$;

create function public.attach_safepay(p_token text,p_tracker text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  select id into v_id from orders where public_token=p_token for update;
  update safepay_payments set tracker=p_tracker,status='PENDING' where order_id=v_id and tracker is null;
  if not found then raise exception 'PAYMENT_ALREADY_ATTACHED'; end if;
  insert into audit_events(actor_email,action,entity_type,entity_id,metadata) values('safepay','payment.session_attached','order',v_id::text,jsonb_build_object('tracker',p_tracker));
end; $$;

create function public.confirm_safepay(p_event text,p_tracker text,p_amount integer,p_currency text,p_environment text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.safepay_payments%rowtype; o public.orders%rowtype;
begin
  select * into p from safepay_payments where tracker=p_tracker;
  if not found then raise exception 'UNKNOWN_TRACKER'; end if;
  select * into o from orders where id=p.order_id for update;
  if p.amount <> p_amount or p.currency <> p_currency or p.environment <> p_environment or o.total <> p_amount then raise exception 'PAYMENT_MISMATCH'; end if;
  if exists(select 1 from safepay_events where event_id=p_event) then return; end if;
  insert into safepay_events(event_id,tracker,kind) values(p_event,p_tracker,'payment.succeeded');
  update safepay_payments set status='PAID' where order_id=o.id;
  update orders set payment_status=case when status='CANCELLED' then 'PAID_REVIEW_REQUIRED' else 'PAID' end,
    status=case when status='PENDING' then 'CONFIRMED' else status end where id=o.id;
  insert into audit_events(actor_email,action,entity_type,entity_id,metadata) values('safepay','payment.verified','order',o.id::text,jsonb_build_object('tracker',p_tracker,'event',p_event));
end; $$;

-- Prevent fulfilment of unverified card orders even through admin status changes.
create function private.guard_safepay_fulfilment() returns trigger language plpgsql as $$
begin
  if new.payment_method='safepay' and new.status in ('CONFIRMED','PROCESSING','PACKED','SHIPPED','DELIVERED') and new.payment_status <> 'PAID' then raise exception 'PAYMENT_NOT_VERIFIED'; end if;
  return new;
end; $$;
create trigger guard_safepay_fulfilment before update on public.orders for each row execute function private.guard_safepay_fulfilment();
revoke all on function public.create_safepay_order(jsonb,jsonb,jsonb,text,text),public.claim_safepay(text,text),public.attach_safepay(text,text),public.confirm_safepay(text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.create_safepay_order(jsonb,jsonb,jsonb,text,text),public.claim_safepay(text,text),public.attach_safepay(text,text),public.confirm_safepay(text,text,integer,text,text) to service_role;
