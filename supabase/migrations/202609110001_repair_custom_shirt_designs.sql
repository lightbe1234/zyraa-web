begin;

-- Repair for projects where the original custom-shirt migration created the
-- options/RPCs but the capability-addressed design table was not present.
create table if not exists public.custom_shirt_designs (
  slug text primary key references public.products(slug),
  details jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

alter table public.order_items add column if not exists custom_details jsonb;
alter table public.custom_shirt_designs enable row level security;
revoke all on public.custom_shirt_designs from public, anon, authenticated;
grant all on public.custom_shirt_designs to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('custom-artwork', 'custom-artwork', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function private.attach_custom_shirt_details()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare d public.custom_shirt_designs%rowtype;
begin
  if new.product_slug like 'custom-%' then
    select * into d from public.custom_shirt_designs where slug = new.product_slug for update;
    if not found or d.expires_at < now() then raise exception 'CUSTOM_DESIGN_EXPIRED'; end if;
    new.custom_details := d.details;
  end if;
  return new;
end;
$$;

drop trigger if exists attach_custom_shirt_details on public.order_items;
create trigger attach_custom_shirt_details
before insert on public.order_items
for each row execute function private.attach_custom_shirt_details();

insert into public.audit_events(actor_email, action, entity_type, entity_id)
values ('database-migration', 'custom_shirt_designs.repaired', 'database', '202609110001');

commit;

notify pgrst, 'reload schema';
