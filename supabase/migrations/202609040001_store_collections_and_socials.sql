create table if not exists public.store_collections (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(trim(name)) between 1 and 80),
  image text not null,
  sort_order integer not null check (sort_order >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create unique index if not exists store_collections_name_unique
on public.store_collections (lower(name));

insert into public.store_collections (slug, name, image, sort_order) values
  ('oversized-tees', 'Oversized Tees', '/product-tee.jpg', 1),
  ('hoodies', 'Hoodies', '/product-hoodie.jpg', 2),
  ('outerwear', 'Outerwear', '/campaign.jpg', 3),
  ('essentials', 'Essentials', '/product-rack.jpg', 4),
  ('bottoms', 'Bottoms', '/collection-studio.jpg', 5),
  ('sweatshirts', 'Sweatshirts', '/collection-store.jpg', 6)
on conflict (slug) do nothing;

drop trigger if exists store_collections_set_updated_at on public.store_collections;
create trigger store_collections_set_updated_at before update on public.store_collections
for each row execute function private.set_updated_at();

create or replace function public.admin_rename_collection(
  p_slug text,
  p_name text,
  p_actor_email text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_name text;
  v_new_name text := trim(p_name);
begin
  if p_slug !~ '^[a-z0-9-]+$' or char_length(v_new_name) not between 1 and 80 then
    raise exception 'INVALID_COLLECTION';
  end if;

  select name into v_old_name
  from public.store_collections
  where slug = p_slug
  for update;

  if v_old_name is null then raise exception 'COLLECTION_NOT_FOUND'; end if;

  update public.store_collections set name = v_new_name where slug = p_slug;
  update public.products set category = v_new_name where category = v_old_name;
  update public.products set collection = v_new_name where collection = v_old_name;

  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values (
    p_actor_email,
    'collection.renamed',
    'store_collection',
    p_slug,
    jsonb_build_object('oldName', v_old_name, 'newName', v_new_name)
  );
  return true;
end;
$$;

alter table public.store_collections enable row level security;
drop policy if exists store_collections_public_read on public.store_collections;
create policy store_collections_public_read on public.store_collections
for select to anon, authenticated using (active);

revoke all on public.store_collections from anon, authenticated;
grant select on public.store_collections to anon, authenticated;
revoke all on function public.admin_rename_collection(text,text,text) from public, anon, authenticated;
grant execute on function public.admin_rename_collection(text,text,text) to service_role;

alter table public.store_settings
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists youtube_url text,
  add column if not exists tiktok_url text,
  add column if not exists whatsapp_url text;

create or replace function public.admin_update_settings(p_settings jsonb, p_actor_email text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.store_settings set
    store_name=trim(p_settings->>'storeName'),
    support_email=lower(trim(p_settings->>'supportEmail')),
    free_shipping_threshold=(p_settings->>'freeShippingThreshold')::integer,
    flat_shipping=(p_settings->>'flatShipping')::integer,
    bank_transfer_instructions=trim(p_settings->>'bankTransferInstructions'),
    instagram_url=nullif(trim(p_settings->>'instagramUrl'), ''),
    facebook_url=nullif(trim(p_settings->>'facebookUrl'), ''),
    youtube_url=nullif(trim(p_settings->>'youtubeUrl'), ''),
    tiktok_url=nullif(trim(p_settings->>'tiktokUrl'), ''),
    whatsapp_url=nullif(trim(p_settings->>'whatsappUrl'), '')
  where singleton;
  insert into public.audit_events (actor_email, action, entity_type, entity_id)
  values (p_actor_email, 'settings.updated', 'store_settings', 'singleton');
  return true;
end;
$$;

revoke all on function public.admin_update_settings(jsonb,text) from public, anon, authenticated;
grant execute on function public.admin_update_settings(jsonb,text) to service_role;
