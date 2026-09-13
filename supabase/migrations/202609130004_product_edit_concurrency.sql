begin;
create or replace function public.admin_save_product_checked(p_product jsonb,p_original_slug text,p_actor_email text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare current_row products%rowtype;
begin
 if p_original_slug is not null then
  select * into current_row from products where slug=p_original_slug for update;
  if current_row.id is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if nullif(p_product->>'updatedAt','') is null or current_row.updated_at<>(p_product->>'updatedAt')::timestamptz then
   raise exception 'PRODUCT_CHANGED';
  end if;
 end if;
 return admin_upsert_product(p_product,p_original_slug,p_actor_email);
end; $$;
revoke all on function public.admin_save_product_checked(jsonb,text,text) from public,anon,authenticated;
grant execute on function public.admin_save_product_checked(jsonb,text,text) to service_role;
commit;
notify pgrst, 'reload schema';
