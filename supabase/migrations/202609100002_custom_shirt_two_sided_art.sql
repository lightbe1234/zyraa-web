-- A single custom order may carry different, private files for front and back.
create or replace function public.create_custom_shirt_design(p_colour text,p_fabric text,p_print text,p_size text,p_instructions text,p_artwork text) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare c custom_shirt_options%rowtype; f custom_shirt_options%rowtype; p custom_shirt_options%rowtype; s text; total integer; d jsonb; v_art jsonb; v_front text; v_back text;
begin
 if not exists(select 1 from custom_shirt_settings where enabled) then raise exception 'CUSTOM_SHIRTS_PAUSED'; end if;
 select * into c from custom_shirt_options where id=p_colour and kind='colour' and active for share;
 select * into f from custom_shirt_options where id=p_fabric and kind='fabric' and active for share;
 select * into p from custom_shirt_options where id=p_print and kind='print' and active for share;
 if c.id is null or f.id is null or p.id is null or p_size is null or p_size not in ('S','M','L','XL','XXL') then raise exception 'INVALID_VARIANT'; end if;
 begin v_art:=p_artwork::jsonb; exception when others then v_art:=jsonb_build_object('front',p_artwork,'back',null); end;
 v_front:=v_art->>'front'; v_back:=nullif(v_art->>'back','');
 if p_instructions is null or length(p_instructions)>1200 or (v_front is null and v_back is null) or (v_front is not null and not exists(select 1 from storage.objects where bucket_id='custom-artwork' and name=v_front)) or (v_back is not null and not exists(select 1 from storage.objects where bucket_id='custom-artwork' and name=v_back)) then raise exception 'INVALID_ARTWORK'; end if;
 if p.name ilike '%front%' and v_front is null then raise exception 'FRONT_ARTWORK_REQUIRED'; end if;
 if p.name ilike '%back%' and v_back is null then raise exception 'BACK_ARTWORK_REQUIRED'; end if;
 s := 'custom-'||replace(gen_random_uuid()::text,'-',''); total := c.price+f.price+p.price;
 d:=jsonb_build_object('colour',c.name,'fabric',f.name,'print',p.name,'size',p_size,'instructions',p_instructions,'artwork',coalesce(v_front,v_back),'frontArtwork',v_front,'backArtwork',v_back,'colourPrice',c.price,'fabricPrice',f.price,'printPrice',p.price);
 insert into products(slug,name,category,collection,price,image,alternate,images,stock,colors,sizes,description,active)
 values(s,'Your custom shirt','Custom shirt','Custom shirt',total,'','','{custom-artwork}',10,array[c.name],array[p_size],f.name||' · '||p.name,true);
 insert into custom_shirt_designs(slug,details) values(s,d);
 insert into audit_events(actor_email,action,entity_type,entity_id) values('storefront','custom_shirt.design_created','custom_shirt',s);
 return s;
end; $$;
