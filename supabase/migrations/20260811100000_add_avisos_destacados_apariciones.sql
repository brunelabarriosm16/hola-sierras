alter table public.avisos_destacados
add column if not exists apariciones bigint not null default 0;

create or replace function public.registrar_aparicion_aviso_destacado(aviso_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.avisos_destacados
  set apariciones = coalesce(apariciones, 0) + 1
  where id = aviso_id and activo = true;
$$;

revoke all on function public.registrar_aparicion_aviso_destacado(bigint) from public;
grant execute on function public.registrar_aparicion_aviso_destacado(bigint) to anon, authenticated;
