alter table public.store_settings
  alter column support_email set default 'info.zyra@gmail.com';

update public.store_settings
set support_email = 'info.zyra@gmail.com',
    whatsapp_url = 'https://wa.me/966595943013',
    updated_at = now();
