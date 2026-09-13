begin;
-- All placement validation, pricing and writes share the same transaction.
-- Keep the single-placement function available for older deployed clients.
create or replace function public.create_custom_shirt_design_multi(
 p_colour text,p_fabric text,p_print text,p_front_positions text[],p_back_positions text[],
 p_size text,p_instructions text,p_artwork text
) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare s text; option_row custom_shirt_options%rowtype; pos text;
 front_names jsonb:='[]'; back_names jsonb:='[]'; front_prices jsonb:='[]'; back_prices jsonb:='[]';
 front_total integer:=0; back_total integer:=0; extra integer; d jsonb;
begin
 if p_front_positions is null or p_back_positions is null or cardinality(p_front_positions)+cardinality(p_back_positions)>20 then raise exception 'INVALID_PLACEMENTS'; end if;
 if cardinality(p_front_positions)<>(select count(distinct x) from unnest(p_front_positions) x)
 or cardinality(p_back_positions)<>(select count(distinct x) from unnest(p_back_positions) x) then raise exception 'DUPLICATE_PLACEMENTS'; end if;
 if (p_print in ('front','both')) <> (cardinality(p_front_positions)>0)
 or (p_print in ('back','both')) <> (cardinality(p_back_positions)>0) then raise exception 'INVALID_PLACEMENTS'; end if;
 perform 1 from custom_shirt_options where id=any(p_front_positions||p_back_positions) order by id for share;
 foreach pos in array p_front_positions loop
  select * into option_row from custom_shirt_options where id=pos and kind='front-position' and active;
  if option_row.id is null then raise exception 'INVALID_FRONT_POSITION'; end if;
  front_names:=front_names||jsonb_build_array(option_row.name); front_prices:=front_prices||jsonb_build_array(option_row.price); front_total:=front_total+option_row.price;
 end loop;
 foreach pos in array p_back_positions loop
  select * into option_row from custom_shirt_options where id=pos and kind='back-position' and active;
  if option_row.id is null then raise exception 'INVALID_BACK_POSITION'; end if;
  back_names:=back_names||jsonb_build_array(option_row.name); back_prices:=back_prices||jsonb_build_array(option_row.price); back_total:=back_total+option_row.price;
 end loop;
 s:=create_custom_shirt_design(p_colour,p_fabric,p_print,p_front_positions[1],p_back_positions[1],p_size,p_instructions,p_artwork);
 select details into d from custom_shirt_designs where slug=s for update;
 extra:=front_total+back_total-coalesce((d->>'frontPositionPrice')::integer,0)-coalesce((d->>'backPositionPrice')::integer,0);
 d:=d||jsonb_build_object('frontPositions',front_names,'backPositions',back_names,'frontPositionPrices',front_prices,'backPositionPrices',back_prices,
 'frontPositionPrice',front_total,'backPositionPrice',back_total,
 'frontPosition',(select string_agg(x,' + ') from jsonb_array_elements_text(front_names) x),
 'backPosition',(select string_agg(x,' + ') from jsonb_array_elements_text(back_names) x));
 update custom_shirt_designs set details=d where slug=s;
 update products set price=price+extra,description=concat_ws(' · ',d->>'fabric',d->>'frontPosition',d->>'backPosition') where slug=s;
 return s;
end; $$;
revoke all on function public.create_custom_shirt_design_multi(text,text,text,text[],text[],text,text,text) from public,anon,authenticated;
grant execute on function public.create_custom_shirt_design_multi(text,text,text,text[],text[],text,text,text) to service_role;
insert into audit_events(actor_email,action,entity_type,entity_id) values('database-migration','atomic_custom_placements.enabled','database','202609130002');
commit;
notify pgrst, 'reload schema';
