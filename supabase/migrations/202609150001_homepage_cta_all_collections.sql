alter table public.store_settings
  alter column hero_cta_href set default '/collections';

update public.store_settings
set hero_cta_href = '/collections'
where hero_cta_href = '/collections/after-hours';
