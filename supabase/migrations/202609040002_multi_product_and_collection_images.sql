alter table public.products
  add column if not exists images text[];

update public.products
set images = array[image, alternate]
where images is null or cardinality(images) = 0;

alter table public.products
  alter column images set not null,
  alter column images set default '{}'::text[];

alter table public.products
  drop constraint if exists products_images_count_check;

alter table public.products
  add constraint products_images_count_check check (cardinality(images) between 1 and 4);

create or replace function public.admin_update_collection(
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
  v_collection public.store_collections%rowtype;
begin
  p_slug := trim(p_slug);
  p_name := trim(p_name);
  p_image := trim(p_image);
  if p_slug !~ '^[a-z0-9-]+$' or char_length(p_name) not between 1 and 80 or char_length(p_image) not between 1 and 2048 then
    raise exception 'INVALID_COLLECTION';
  end if;

  select * into v_collection from public.store_collections where slug = p_slug for update;
  if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;

  update public.store_collections
  set name = p_name, image = p_image
  where slug = p_slug;

  if v_collection.name <> p_name then
    update public.products set category = p_name where category = v_collection.name;
    update public.products set collection = p_name where collection = v_collection.name;
  end if;

  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values (
    p_actor_email,
    'collection.updated',
    'store_collection',
    p_slug,
    jsonb_build_object('from_name', v_collection.name, 'to_name', p_name, 'from_image', v_collection.image, 'to_image', p_image)
  );
  return true;
end;
$$;

revoke all on function public.admin_update_collection(text,text,text,text) from public, anon, authenticated;
grant execute on function public.admin_update_collection(text,text,text,text) to service_role;

create or replace function public.admin_upsert_product(p_product jsonb, p_original_slug text, p_actor_email text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_slug text := trim(p_product->>'slug');
  v_images text[] := array(select jsonb_array_elements_text(p_product->'images'));
begin
  if v_slug !~ '^[a-z0-9-]+$' then raise exception 'INVALID_SLUG'; end if;
  if cardinality(v_images) not between 1 and 4 then raise exception 'INVALID_IMAGE_COUNT'; end if;
  if p_original_slug is null then
    insert into public.products (slug,name,category,collection,price,compare_at,image,alternate,images,rating,reviews,stock,colors,sizes,featured,new_arrival,active,description)
    values (v_slug, trim(p_product->>'name'), trim(p_product->>'category'), trim(p_product->>'collection'), (p_product->>'price')::integer,
      nullif(p_product->>'compareAt','')::integer, v_images[1], coalesce(v_images[2], v_images[1]), v_images, coalesce((p_product->>'rating')::numeric,0),
      coalesce((p_product->>'reviews')::integer,0), (p_product->>'stock')::integer, array(select jsonb_array_elements_text(p_product->'colors')),
      array(select jsonb_array_elements_text(p_product->'sizes')), coalesce((p_product->>'featured')::boolean,false),
      coalesce((p_product->>'newArrival')::boolean,false), coalesce((p_product->>'active')::boolean,true), trim(p_product->>'description'))
    returning id into v_id;
  else
    update public.products set slug=v_slug, name=trim(p_product->>'name'), category=trim(p_product->>'category'), collection=trim(p_product->>'collection'),
      price=(p_product->>'price')::integer, compare_at=nullif(p_product->>'compareAt','')::integer, image=v_images[1], alternate=coalesce(v_images[2], v_images[1]), images=v_images,
      rating=coalesce((p_product->>'rating')::numeric,0), reviews=coalesce((p_product->>'reviews')::integer,0), stock=(p_product->>'stock')::integer,
      colors=array(select jsonb_array_elements_text(p_product->'colors')), sizes=array(select jsonb_array_elements_text(p_product->'sizes')),
      featured=coalesce((p_product->>'featured')::boolean,false), new_arrival=coalesce((p_product->>'newArrival')::boolean,false),
      active=coalesce((p_product->>'active')::boolean,true), description=trim(p_product->>'description')
    where slug = p_original_slug returning id into v_id;
    if v_id is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  end if;
  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values (p_actor_email, case when p_original_slug is null then 'product.created' else 'product.updated' end, 'product', v_id::text, jsonb_build_object('slug', v_slug, 'image_count', cardinality(v_images)));
  return v_id;
end;
$$;

revoke all on function public.admin_upsert_product(jsonb,text,text) from public, anon, authenticated;
grant execute on function public.admin_upsert_product(jsonb,text,text) to service_role;
