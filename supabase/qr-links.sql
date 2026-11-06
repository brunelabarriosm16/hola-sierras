-- Run once in Supabase SQL Editor before using /qrsir01.
create table if not exists public.qr_links (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 100),
  destination text not null check (destination ~ '^https?://'),
  android_destination text,
  iphone_destination text,
  opens bigint not null default 0 check (opens >= 0),
  android_opens bigint not null default 0,
  iphone_opens bigint not null default 0,
  other_opens bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.qr_links enable row level security;
revoke all on public.qr_links from anon, authenticated;
grant select, insert, update on public.qr_links to service_role;

-- The update is atomic: simultaneous visits do not overwrite each other.
create or replace function public.register_qr_open(link_id uuid, device_type text)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  update public.qr_links set opens = opens + 1,
    android_opens = android_opens + case when device_type = 'android' then 1 else 0 end,
    iphone_opens = iphone_opens + case when device_type = 'iphone' then 1 else 0 end,
    other_opens = other_opens + case when device_type not in ('android', 'iphone') then 1 else 0 end
  where id = link_id
  returning jsonb_build_object('destination', destination,
    'android_destination', android_destination, 'iphone_destination', iphone_destination);
$$;

revoke all on function public.register_qr_open(uuid, text) from public, anon, authenticated;
grant execute on function public.register_qr_open(uuid, text) to service_role;
