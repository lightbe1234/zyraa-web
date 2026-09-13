begin;
create table if not exists public.order_notifications (
 order_id uuid primary key references public.orders(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','sending','sent','failed')),
 attempts integer not null default 0,
 claimed_at timestamptz,
 sent_at timestamptz
);
alter table public.order_notifications enable row level security;
revoke all on public.order_notifications from public,anon,authenticated;
grant all on public.order_notifications to service_role;
create or replace function private.queue_order_notification() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin insert into order_notifications(order_id) values(new.id) on conflict do nothing; return new; end; $$;
drop trigger if exists queue_order_notification on public.orders;
create trigger queue_order_notification after insert on public.orders for each row execute function private.queue_order_notification();
create or replace function public.claim_order_notification(p_number text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare claimed uuid;
begin
 update order_notifications n set state='sending',attempts=attempts+1,claimed_at=now()
 from orders o where n.order_id=o.id and o.order_number=p_number and n.attempts<5
 and (n.state in ('pending','failed') or (n.state='sending' and n.claimed_at<now()-interval '2 minutes')) returning n.order_id into claimed;
 return claimed is not null;
end; $$;
create or replace function public.finish_order_notification(p_number text,p_sent boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update order_notifications n set state=case when p_sent then 'sent' else 'failed' end,sent_at=case when p_sent then now() else null end
 from orders o where n.order_id=o.id and o.order_number=p_number and n.state='sending';
 insert into audit_events(actor_email,action,entity_type,entity_id) values('notification-worker',case when p_sent then 'order.email_sent' else 'order.email_failed' end,'order',p_number);
end; $$;
revoke all on function public.claim_order_notification(text), public.finish_order_notification(text,boolean) from public,anon,authenticated;
grant execute on function public.claim_order_notification(text), public.finish_order_notification(text,boolean) to service_role;
commit;
notify pgrst, 'reload schema';
