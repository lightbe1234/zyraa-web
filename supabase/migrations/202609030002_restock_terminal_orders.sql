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

  if p_status in ('CANCELLED', 'RETURNED') then
    update public.products as product
    set stock = product.stock + returned.quantity
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = v_order.id
      group by product_id
    ) as returned
    where product.id = returned.product_id;
  end if;

  update public.orders set status = p_status where id = v_order.id;
  insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
  values (p_actor_email, 'order.status_changed', 'order', v_order.id::text, jsonb_build_object('from', v_order.status, 'to', p_status));
  return v_order.id;
end;
$$;

revoke all on function public.admin_update_order_status(text,text,text) from public, anon, authenticated;
grant execute on function public.admin_update_order_status(text,text,text) to service_role;
