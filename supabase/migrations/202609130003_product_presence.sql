begin;
create table if not exists public.product_presence (
 product_slug text not null references products(slug) on update cascade on delete cascade,
 visitor_hash text not null,
 seen_at timestamptz not null default now(),
 primary key(product_slug,visitor_hash)
);
create index if not exists product_presence_seen_idx on public.product_presence(seen_at);
alter table public.product_presence enable row level security;
revoke all on public.product_presence from public,anon,authenticated;
grant all on public.product_presence to service_role;
create or replace function public.product_heartbeat(p_slug text,p_visitor text) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 if p_visitor !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_VISITOR'; end if;
 if not exists(select 1 from products where slug=p_slug and active) then return 0; end if;
 delete from product_presence where seen_at < now()-interval '2 minutes';
 insert into product_presence(product_slug,visitor_hash) values(p_slug,p_visitor)
 on conflict(product_slug,visitor_hash) do update set seen_at=now();
 select count(*)::integer into n from product_presence where product_slug=p_slug and seen_at > now()-interval '60 seconds';
 return n;
end; $$;
revoke all on function public.product_heartbeat(text,text) from public,anon,authenticated;
grant execute on function public.product_heartbeat(text,text) to service_role;
commit;
notify pgrst, 'reload schema';
