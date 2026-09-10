-- Collection lifecycle actions are deliberately non-destructive: products and
-- historic orders remain intact when a storefront collection is removed.
create or replace function public.admin_create_collection(
  p_slug text,
  p_name text,
  p_image text,
  p_actor_email text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sort_order integer;
begin
  p_slug := trim(p_slug);
  p_name := trim(p_name);
  p_image := trim(p_image);

  if p_slug !~ '^[a-z0-9-]+$'
    or char_length(p_name) not between 1 and 80
    or char_length(p_image) not between 1 and 2048 then
    raise exception 'INVALID_COLLECTION';
  end if;

  perform pg_advisory_xact_lock(hashtext('store_collections_sort_order'));
  select coalesce(max(sort_order), 0) + 1 into v_sort_order from public.store_collections;

  insert into public.store_collections (slug, name, image, sort_order, active)
  values (p_slug, p_name, p_image, v_sort_order, true);

  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values (p_actor_email, 'collection.created', 'store_collection', p_slug, jsonb_build_object('name', p_name));
  return true;
end;
$$;

create or replace function public.admin_archive_collection(
  p_slug text,
  p_actor_email text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_collection public.store_collections%rowtype;
  v_product_count integer;
  v_home_card_count integer;
begin
  p_slug := trim(p_slug);
  if p_slug !~ '^[a-z0-9-]+$' then raise exception 'INVALID_COLLECTION'; end if;

  select * into v_collection from public.store_collections where slug = p_slug for update;
  if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
  if not v_collection.active then raise exception 'COLLECTION_ALREADY_ARCHIVED'; end if;

  select count(*) into v_product_count
  from public.products
  where active and (category = v_collection.name or collection = v_collection.name);

  update public.store_collections set active = false where slug = p_slug;

  update public.home_collection_cards
  set enabled = false
  where collection_slug = p_slug and enabled;
  get diagnostics v_home_card_count = row_count;

  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values (
    p_actor_email,
    'collection.archived',
    'store_collection',
    p_slug,
    jsonb_build_object('name', v_collection.name, 'active_product_count', v_product_count, 'disabled_home_card_count', v_home_card_count)
  );
  return true;
end;
$$;

revoke all on function public.admin_create_collection(text,text,text,text) from public, anon, authenticated;
grant execute on function public.admin_create_collection(text,text,text,text) to service_role;
revoke all on function public.admin_archive_collection(text,text) from public, anon, authenticated;
grant execute on function public.admin_archive_collection(text,text) to service_role;
