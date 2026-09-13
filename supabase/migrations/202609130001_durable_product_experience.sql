begin;
create table if not exists public.product_details (
  product_slug text primary key references public.products(slug) on update cascade on delete restrict,
  details jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null references public.products(slug) on update cascade on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  author text not null,
  rating integer not null check(rating between 1 and 5),
  text text not null check(length(text) between 20 and 1000),
  size text not null,
  created_at timestamptz not null default now(),
  unique(order_id, product_slug)
);
create index if not exists product_reviews_slug_created_idx on public.product_reviews(product_slug, created_at desc);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists home_collection_cards_collection_idx on public.home_collection_cards(collection_slug);
alter table public.product_details enable row level security;
alter table public.product_reviews enable row level security;
revoke all on public.product_details, public.product_reviews from public, anon, authenticated;
grant all on public.product_details, public.product_reviews to service_role;

create or replace function public.save_product_details(p_slug text, p_details jsonb, p_actor text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if length(p_actor)=0 or jsonb_typeof(p_details)<>'object' or octet_length(p_details::text)>16000 then raise exception 'INVALID_DETAILS'; end if;
 insert into product_details(product_slug,details) values(p_slug,p_details)
 on conflict(product_slug) do update set details=excluded.details,updated_at=now();
 insert into audit_events(actor_email,action,entity_type,entity_id) values(p_actor,'product.details_saved','product',p_slug);
end; $$;

create or replace function public.add_product_review(p_slug text,p_token text,p_rating integer,p_text text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare o orders%rowtype; v_size text;
begin
 select * into o from orders where public_token=p_token and status='DELIVERED' for share;
 if o.id is null then raise exception 'DELIVERED_ORDER_REQUIRED'; end if;
 select size into v_size from order_items where order_id=o.id and product_slug=p_slug limit 1;
 if v_size is null then raise exception 'ORDER_PRODUCT_REQUIRED'; end if;
 insert into product_reviews(product_slug,order_id,author,rating,text,size)
 values(p_slug,o.id,left(o.first_name,30)||' '||left(o.last_name,1)||'.',p_rating,trim(p_text),v_size);
 insert into audit_events(actor_email,action,entity_type,entity_id) values('storefront','product.review_added','product',p_slug);
end; $$;
revoke all on function public.save_product_details(text,jsonb,text), public.add_product_review(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.save_product_details(text,jsonb,text), public.add_product_review(text,text,integer,text) to service_role;
insert into audit_events(actor_email,action,entity_type,entity_id) values('database-migration','durable_product_experience.enabled','database','202609130001');
commit;
notify pgrst, 'reload schema';
