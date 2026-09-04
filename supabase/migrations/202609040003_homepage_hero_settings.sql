alter table public.store_settings
  add column if not exists hero_image text not null default '/break-the-pattern-hero.jpeg',
  add column if not exists hero_eyebrow text not null default 'ZYRA / DROP 01',
  add column if not exists hero_heading text not null default E'BREAK\nTHE\nPATTERN',
  add column if not exists hero_cta_label text not null default 'Shop the drop',
  add column if not exists hero_cta_href text not null default '/collections/after-hours';

create or replace function public.admin_update_settings(p_settings jsonb, p_actor_email text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.store_settings set
    store_name=trim(p_settings->>'storeName'),
    support_email=lower(trim(p_settings->>'supportEmail')),
    free_shipping_threshold=(p_settings->>'freeShippingThreshold')::integer,
    flat_shipping=(p_settings->>'flatShipping')::integer,
    bank_transfer_instructions=trim(p_settings->>'bankTransferInstructions'),
    instagram_url=nullif(trim(p_settings->>'instagramUrl'), ''),
    facebook_url=nullif(trim(p_settings->>'facebookUrl'), ''),
    youtube_url=nullif(trim(p_settings->>'youtubeUrl'), ''),
    tiktok_url=nullif(trim(p_settings->>'tiktokUrl'), ''),
    whatsapp_url=nullif(trim(p_settings->>'whatsappUrl'), ''),
    hero_image=coalesce(nullif(trim(p_settings->>'heroImage'), ''), hero_image),
    hero_eyebrow=coalesce(nullif(trim(p_settings->>'heroEyebrow'), ''), hero_eyebrow),
    hero_heading=coalesce(nullif(trim(p_settings->>'heroHeading'), ''), hero_heading),
    hero_cta_label=coalesce(nullif(trim(p_settings->>'heroCtaLabel'), ''), hero_cta_label),
    hero_cta_href=coalesce(nullif(trim(p_settings->>'heroCtaHref'), ''), hero_cta_href)
  where singleton;

  insert into public.audit_events (actor_email, action, entity_type, entity_id)
  values (p_actor_email, 'settings.updated', 'store_settings', 'singleton');
  return true;
end;
$$;

revoke all on function public.admin_update_settings(jsonb,text) from public, anon, authenticated;
grant execute on function public.admin_update_settings(jsonb,text) to service_role;
