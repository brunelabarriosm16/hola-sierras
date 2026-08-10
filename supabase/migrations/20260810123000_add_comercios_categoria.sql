alter table public.comercios
add column if not exists categoria text;

update public.comercios
set categoria = 'Comercio'
where categoria is null or btrim(categoria) = '';
