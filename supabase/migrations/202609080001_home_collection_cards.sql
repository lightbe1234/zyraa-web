create table if not exists public.home_collection_cards (
  key text primary key check (key ~ '^[a-z0-9-]+$'),
  eyebrow text not null check (char_length(trim(eyebrow)) between 1 and 80),
  title text not null check (char_length(trim(title)) between 1 and 80),
  image text not null check (char_length(trim(image)) between 1 and 2048),
  collection_slug text not null references public.store_collections(slug) on update cascade,
  sort_order integer not null check (sort_order >= 0),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.home_collection_cards
  (key, eyebrow, title, image, collection_slug, sort_order, enabled)
values
  ('featured-one', 'Collection / 001', 'Anime Collection', '/anime-collection.jpeg', 'outerwear', 1, true),
  ('featured-two', 'Collection / 002', 'Street Wear', '/street-wear.jpeg', 'hoodies', 2, true)
on conflict (key) do nothing;

drop trigger if exists home_collection_cards_set_updated_at on public.home_collection_cards;
create trigger home_collection_cards_set_updated_at before update on public.home_collection_cards
for each row execute function private.set_updated_at();

alter table public.home_collection_cards enable row level security;
drop policy if exists home_collection_cards_public_read on public.home_collection_cards;
create policy home_collection_cards_public_read on public.home_collection_cards
for select to anon, authenticated using (enabled);

revoke all on public.home_collection_cards from anon, authenticated;
grant select on public.home_collection_cards to anon, authenticated;

create or replace function public.admin_update_home_collection_card(
  p_card jsonb,
  p_actor_email text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := trim(p_card->>'key');
  v_eyebrow text := trim(p_card->>'eyebrow');
  v_title text := trim(p_card->>'title');
  v_image text := trim(p_card->>'image');
  v_collection_slug text := trim(p_card->>'collectionSlug');
  v_enabled boolean := coalesce((p_card->>'enabled')::boolean, true);
  v_previous jsonb;
begin
  if v_key !~ '^[a-z0-9-]+$'
    or char_length(v_eyebrow) not between 1 and 80
    or char_length(v_title) not between 1 and 80
    or char_length(v_image) not between 1 and 2048
    or v_collection_slug !~ '^[a-z0-9-]+$' then
    raise exception 'INVALID_HOME_COLLECTION_CARD';
  end if;

  if not exists (select 1 from public.store_collections where slug = v_collection_slug and active) then
    raise exception 'COLLECTION_NOT_FOUND';
  end if;

  select to_jsonb(card) into v_previous
  from public.home_collection_cards card
  where card.key = v_key
  for update;

  if v_previous is null then raise exception 'HOME_COLLECTION_CARD_NOT_FOUND'; end if;

  update public.home_collection_cards set
    eyebrow = v_eyebrow,
    title = v_title,
    image = v_image,
    collection_slug = v_collection_slug,
    enabled = v_enabled
  where key = v_key;

  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values (
    p_actor_email,
    'homepage_collection_card.updated',
    'home_collection_card',
    v_key,
    jsonb_build_object('previous', v_previous, 'next', p_card)
  );
  return true;
end;
$$;

revoke all on function public.admin_update_home_collection_card(jsonb,text) from public, anon, authenticated;
grant execute on function public.admin_update_home_collection_card(jsonb,text) to service_role;
