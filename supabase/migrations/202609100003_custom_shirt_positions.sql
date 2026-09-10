-- Editable custom-section banner and separately priced front/back placements.
begin;
alter table public.custom_shirt_options drop constraint if exists custom_shirt_options_kind_check;
alter table public.custom_shirt_options add constraint custom_shirt_options_kind_check check(kind in ('colour','fabric','print','front-position','back-position'));
alter table public.custom_shirt_settings add column if not exists custom_banner_image text not null default '/street-wear.jpeg';
update public.custom_shirt_options set price=0, description='Choose the side first, then select a priced placement.' where id in ('front','back','both');
insert into public.custom_shirt_options(id,kind,name,description,image,price,sort_order) values
 ('front-centre','front-position','Centre chest','Classic centred front print.','',35000,1),
 ('front-left-chest','front-position','Left chest','A small mark over the heart.','',30000,2),
 ('front-right-chest','front-position','Right chest','A small print on the right side.','',30000,3),
 ('back-centre','back-position','Centre back','Full back print, centred.','',35000,1),
 ('back-upper','back-position','Upper back','Across the shoulders, below the neck.','',30000,2),
 ('back-neck','back-position','Back neck','A small detail under the collar.','',20000,3)
on conflict(id) do nothing;

create or replace function public.save_custom_shirt_config(p_option jsonb,p_settings jsonb,p_actor text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_option is not null then
  insert into custom_shirt_options(id,kind,name,description,image,price,active,sort_order)
  values(p_option->>'id',p_option->>'kind',p_option->>'name',coalesce(p_option->>'description',''),coalesce(p_option->>'image',''),(p_option->>'price')::integer,coalesce((p_option->>'active')::boolean,true),coalesce((p_option->>'sort_order')::integer,0))
  on conflict(id) do update set name=excluded.name,description=excluded.description,image=excluded.image,price=excluded.price,active=excluded.active,sort_order=excluded.sort_order;
 end if;
 if p_settings is not null then
  if length(p_settings->>'button_label') not between 1 and 60 or length(p_settings->>'heading') not between 1 and 100 or length(p_settings->>'intro')>300 or length(coalesce(p_settings->>'custom_banner_image',''))>1000 then raise exception 'INVALID_SETTINGS'; end if;
  update custom_shirt_settings set heading=p_settings->>'heading',intro=p_settings->>'intro',button_label=p_settings->>'button_label',enabled=(p_settings->>'enabled')::boolean,custom_banner_image=coalesce(nullif(p_settings->>'custom_banner_image',''),'/street-wear.jpeg') where singleton;
 end if;
 insert into audit_events(actor_email,action,entity_type,entity_id) values(p_actor,'custom_shirt.config_updated','custom_shirt',coalesce(p_option->>'id','settings'));
 return true;
end; $$;

create or replace function public.create_custom_shirt_design(p_colour text,p_fabric text,p_print text,p_front_position text,p_back_position text,p_size text,p_instructions text,p_artwork text) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare c custom_shirt_options%rowtype; f custom_shirt_options%rowtype; p custom_shirt_options%rowtype; fp custom_shirt_options%rowtype; bp custom_shirt_options%rowtype; s text; total integer; d jsonb; v_art jsonb; v_front text; v_back text; wants_front boolean; wants_back boolean;
begin
 if not exists(select 1 from custom_shirt_settings where enabled) then raise exception 'CUSTOM_SHIRTS_PAUSED'; end if;
 select * into c from custom_shirt_options where id=p_colour and kind='colour' and active for share;
 select * into f from custom_shirt_options where id=p_fabric and kind='fabric' and active for share;
 select * into p from custom_shirt_options where id=p_print and kind='print' and active for share;
 wants_front:=p_print in ('front','both'); wants_back:=p_print in ('back','both');
 if c.id is null or f.id is null or p.id is null or p_size not in ('S','M','L','XL','XXL') then raise exception 'INVALID_VARIANT'; end if;
 if wants_front then select * into fp from custom_shirt_options where id=p_front_position and kind='front-position' and active for share; if fp.id is null then raise exception 'INVALID_FRONT_POSITION'; end if; elsif coalesce(p_front_position,'')<>'' then raise exception 'INVALID_FRONT_POSITION'; end if;
 if wants_back then select * into bp from custom_shirt_options where id=p_back_position and kind='back-position' and active for share; if bp.id is null then raise exception 'INVALID_BACK_POSITION'; end if; elsif coalesce(p_back_position,'')<>'' then raise exception 'INVALID_BACK_POSITION'; end if;
 begin v_art:=p_artwork::jsonb; exception when others then v_art:=jsonb_build_object('front',p_artwork,'back',null); end;
 v_front:=v_art->>'front'; v_back:=nullif(v_art->>'back','');
 if p_instructions is null or length(p_instructions)>1200 or (v_front is null and v_back is null) or (v_front is not null and not exists(select 1 from storage.objects where bucket_id='custom-artwork' and name=v_front)) or (v_back is not null and not exists(select 1 from storage.objects where bucket_id='custom-artwork' and name=v_back)) then raise exception 'INVALID_ARTWORK'; end if;
 if wants_front and v_front is null then raise exception 'FRONT_ARTWORK_REQUIRED'; end if;
 if wants_back and v_back is null then raise exception 'BACK_ARTWORK_REQUIRED'; end if;
 s:='custom-'||replace(gen_random_uuid()::text,'-',''); total:=c.price+f.price+p.price+coalesce(fp.price,0)+coalesce(bp.price,0);
 d:=jsonb_build_object('colour',c.name,'fabric',f.name,'print',p.name,'frontPosition',fp.name,'backPosition',bp.name,'size',p_size,'instructions',p_instructions,'artwork',coalesce(v_front,v_back),'frontArtwork',v_front,'backArtwork',v_back,'colourPrice',c.price,'fabricPrice',f.price,'printPrice',p.price,'frontPositionPrice',coalesce(fp.price,0),'backPositionPrice',coalesce(bp.price,0));
 insert into products(slug,name,category,collection,price,image,alternate,images,stock,colors,sizes,description,active) values(s,'Your custom shirt','Custom shirt','Custom shirt',total,'','','{custom-artwork}',10,array[c.name],array[p_size],concat_ws(' · ',f.name,fp.name,bp.name),true);
 insert into custom_shirt_designs(slug,details) values(s,d);
 insert into audit_events(actor_email,action,entity_type,entity_id) values('storefront','custom_shirt.design_created','custom_shirt',s);
 return s;
end; $$;
revoke all on function public.create_custom_shirt_design(text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_custom_shirt_design(text,text,text,text,text,text,text,text) to service_role;
insert into public.audit_events(actor_email,action,entity_type,entity_id) values('database-migration','custom_shirt_positions.enabled','database','202609100003');
commit;
