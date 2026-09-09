create table if not exists public.visitor_activity (
  id bigint generated always as identity primary key,
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  action text not null check (action in ('page_view', 'add_to_bag', 'checkout_view')),
  path text not null check (
    path in ('/', '/collections', '/checkout')
    or path ~ '^/(products|collections)/[a-z0-9-]{1,100}$'
  ),
  device text not null check (device in ('Mobile', 'Desktop / tablet')),
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists visitor_activity_mode_created_idx
  on public.visitor_activity (is_test, created_at desc);
create index if not exists visitor_activity_visitor_mode_created_idx
  on public.visitor_activity (visitor_hash, is_test, created_at desc);

alter table public.visitor_activity enable row level security;
revoke all on public.visitor_activity from public, anon, authenticated;

create or replace function public.record_visitor_activity(
  p_visitor_hash text,
  p_action text,
  p_path text,
  p_device text,
  p_is_test boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_visitor_hash !~ '^[a-f0-9]{64}$'
    or p_action not in ('page_view', 'add_to_bag', 'checkout_view')
    or p_device not in ('Mobile', 'Desktop / tablet')
    or (
      p_path not in ('/', '/collections', '/checkout')
      and p_path !~ '^/(products|collections)/[a-z0-9-]{1,100}$'
    )
    or (p_action = 'checkout_view' and p_path <> '/checkout')
    or (p_action = 'add_to_bag' and p_path !~ '^/products/[a-z0-9-]{1,100}$') then
    raise exception 'INVALID_VISITOR_ACTIVITY';
  end if;

  if not public.consume_api_rate_limit('visitor-activity-global', 'global', 1000, 60)
    or not public.consume_api_rate_limit('visitor-activity-session', p_visitor_hash, 60, 60) then
    return false;
  end if;

  delete from public.visitor_activity where created_at < now() - interval '30 days';
  insert into public.visitor_activity (visitor_hash, action, path, device, is_test)
  values (p_visitor_hash, p_action, p_path, p_device, coalesce(p_is_test, false));
  return true;
end;
$$;

create or replace function public.admin_read_visitor_activity(p_is_test boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  delete from public.visitor_activity where created_at < now() - interval '30 days';

  select jsonb_build_object(
    'summary', jsonb_build_object(
      'visitors', count(distinct visitor_hash),
      'views', count(*) filter (where action = 'page_view'),
      'bagAdds', count(*) filter (where action = 'add_to_bag'),
      'checkouts', count(*) filter (where action = 'checkout_view')
    ),
    'visitors', coalesce((
      select jsonb_agg(to_jsonb(recent_visitors) order by recent_visitors."lastSeen" desc)
      from (
        select
          visitor_hash as visitor,
          floor(extract(epoch from min(created_at)) * 1000)::bigint as "firstSeen",
          floor(extract(epoch from max(created_at)) * 1000)::bigint as "lastSeen",
          count(*)::integer as events,
          max(device) as device
        from public.visitor_activity
        where is_test = coalesce(p_is_test, false)
        group by visitor_hash
        order by max(created_at) desc
        limit 100
      ) recent_visitors
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(recent_events) order by recent_events.created desc)
      from (
        select
          visitor_hash as visitor,
          action,
          path,
          device,
          floor(extract(epoch from created_at) * 1000)::bigint as created
        from public.visitor_activity
        where is_test = coalesce(p_is_test, false)
        order by created_at desc
        limit 1000
      ) recent_events
    ), '[]'::jsonb),
    'mode', case when coalesce(p_is_test, false) then 'preview' else 'customers' end
  ) into v_result
  from public.visitor_activity
  where is_test = coalesce(p_is_test, false);

  return v_result;
end;
$$;

revoke all on function public.record_visitor_activity(text,text,text,text,boolean) from public, anon, authenticated;
revoke all on function public.admin_read_visitor_activity(boolean) from public, anon, authenticated;
grant execute on function public.record_visitor_activity(text,text,text,text,boolean) to service_role;
grant execute on function public.admin_read_visitor_activity(boolean) to service_role;

insert into public.audit_events (actor_email, action, entity_type, entity_id, metadata)
values ('database-migration', 'visitor_activity.enabled', 'visitor_activity', 'production', jsonb_build_object('retention_days', 30));
