alter table public.servicios
  add column if not exists habitaciones integer,
  add column if not exists estacionamiento boolean not null default false,
  add column if not exists wifi boolean not null default false,
  add column if not exists facilidades text,
  add column if not exists google_maps_url text;

alter table public.servicios
  drop constraint if exists servicios_habitaciones_nonnegative;

alter table public.servicios
  add constraint servicios_habitaciones_nonnegative
  check (habitaciones is null or habitaciones >= 0);
