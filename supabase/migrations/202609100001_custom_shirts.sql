begin;
create table public.custom_shirt_options (
 id text primary key check (id ~ '^[a-z0-9-]{1,80}$'), kind text not null check(kind in ('colour','fabric','print')),
 name text not null check(length(name) between 1 and 80), description text not null default '' check(length(description)<=300),
 image text not null default '', price integer not null check(price between 0 and 10000000), active boolean not null default true, sort_order integer not null default 0
);
create table public.custom_shirt_settings (singleton boolean primary key default true check(singleton), heading text not null, intro text not null, button_label text not null, enabled boolean not null default true);
insert into public.custom_shirt_settings values(true,'Your idea. Your shirt.','That sketch. That inside joke. That thing you wish was on a tee. Start here.','Add my design to bag',true);
insert into public.custom_shirt_options(id,kind,name,description,image,price,sort_order) values
 ('black','colour','Black','A dark base for a bold print.','/custom-shirts/black.svg',0,1),
 ('white','colour','White','Keep it clean. Let your artwork speak.','/custom-shirts/white.svg',0,2),
 ('grey','colour','Grey','An easy everyday neutral.','/custom-shirts/grey.svg',0,3),
 ('blue','colour','Blue','A little colour before the print.','/custom-shirts/blue.svg',10000,4),
 ('cotton','fabric','Cotton','A familiar feel for your everyday tee.','',149000,1),
 ('terry','fabric','Terry cotton','A textured loopback option with a weightier feel.','',189000,2),
 ('combed','fabric','Combed cotton','A smooth finish for a clean, soft feel.','',169000,3),
 ('front','print','Front print','One design on the front.','',35000,1),
 ('back','print','Back print','One design on the back.','',35000,2),
 ('both','print','Front + back','The same artwork on both sides. Add placement notes below.','',65000,3);
create table public.custom_shirt_designs (
 slug text primary key references public.products(slug), details jsonb not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours'
);
alter table public.order_items add column custom_details jsonb;
alter table public.custom_shirt_options enable row level security;
alter table public.custom_shirt_settings enable row level security;
alter table public.custom_shirt_designs enable row level security;
revoke all on public.custom_shirt_options, public.custom_shirt_settings, public.custom_shirt_designs from public,anon,authenticated;
grant all on public.custom_shirt_options, public.custom_shirt_settings, public.custom_shirt_designs to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('custom-artwork','custom-artwork',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;

create function public.save_custom_shirt_config(p_option jsonb,p_settings jsonb,p_actor text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_option is not null then
 insert into custom_shirt_options(id,kind,name,description,image,price,active,sort_order)
 values(p_option->>'id',p_option->>'kind',p_option->>'name',coalesce(p_option->>'description',''),coalesce(p_option->>'image',''),(p_option->>'price')::integer,coalesce((p_option->>'active')::boolean,true),coalesce((p_option->>'sort_order')::integer,0))
 on conflict(id) do update set name=excluded.name,description=excluded.description,image=excluded.image,price=excluded.price,active=excluded.active,sort_order=excluded.sort_order;
 end if;
 if p_settings is not null then
 if length(p_settings->>'button_label') not between 1 and 60 or length(p_settings->>'heading') not between 1 and 100 or length(p_settings->>'intro')>300 then raise exception 'INVALID_SETTINGS'; end if;
 update custom_shirt_settings set heading=p_settings->>'heading',intro=p_settings->>'intro',button_label=p_settings->>'button_label',enabled=(p_settings->>'enabled')::boolean where singleton;
 end if;
 insert into audit_events(actor_email,action,entity_type,entity_id) values(p_actor,'custom_shirt.config_updated','custom_shirt',coalesce(p_option->>'id','settings'));
 return true;
end; $$;

create function public.create_custom_shirt_design(p_colour text,p_fabric text,p_print text,p_size text,p_instructions text,p_artwork text) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare c custom_shirt_options%rowtype; f custom_shirt_options%rowtype; p custom_shirt_options%rowtype; s text; total integer; d jsonb;
begin
 if not exists(select 1 from custom_shirt_settings where enabled) then raise exception 'CUSTOM_SHIRTS_PAUSED'; end if;
 select * into c from custom_shirt_options where id=p_colour and kind='colour' and active for share;
 select * into f from custom_shirt_options where id=p_fabric and kind='fabric' and active for share;
 select * into p from custom_shirt_options where id=p_print and kind='print' and active for share;
 if c.id is null or f.id is null or p.id is null or p_size is null or p_size not in ('S','M','L','XL','XXL') then raise exception 'INVALID_VARIANT'; end if;
 if p_instructions is null or length(p_instructions)>1200 or p_artwork is null or not exists(select 1 from storage.objects where bucket_id='custom-artwork' and name=p_artwork) then raise exception 'INVALID_ARTWORK'; end if;
 s := 'custom-'||replace(gen_random_uuid()::text,'-',''); total := c.price+f.price+p.price;
 d:=jsonb_build_object('colour',c.name,'fabric',f.name,'print',p.name,'size',p_size,'instructions',p_instructions,'artwork',p_artwork,'colourPrice',c.price,'fabricPrice',f.price,'printPrice',p.price);
 insert into products(slug,name,category,collection,price,image,alternate,images,stock,colors,sizes,description,active)
 values(s,'Your custom shirt','Custom shirt','Custom shirt',total,'','','{custom-artwork}',10,array[c.name],array[p_size],f.name||' · '||p.name,true);
 insert into custom_shirt_designs(slug,details) values(s,d);
 insert into audit_events(actor_email,action,entity_type,entity_id) values('storefront','custom_shirt.design_created','custom_shirt',s);
 return s;
end; $$;

create function private.attach_custom_shirt_details() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare d custom_shirt_designs%rowtype;
begin
 if new.product_slug like 'custom-%' then
 select * into d from custom_shirt_designs where slug=new.product_slug for update;
 if not found or d.expires_at<now() then raise exception 'CUSTOM_DESIGN_EXPIRED'; end if;
 new.custom_details:=d.details;
 end if;
 return new;
end; $$;
create trigger attach_custom_shirt_details before insert on public.order_items for each row execute function private.attach_custom_shirt_details();
-- Custom products are capability-addressed designs, never public catalog entries.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon,authenticated using(active and slug not like 'custom-%');
revoke all on function public.save_custom_shirt_config(jsonb,jsonb,text),public.create_custom_shirt_design(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.save_custom_shirt_config(jsonb,jsonb,text),public.create_custom_shirt_design(text,text,text,text,text,text) to service_role;
insert into public.audit_events(actor_email,action,entity_type,entity_id) values('database-migration','custom_shirts.enabled','database','202609100001');
commit;
