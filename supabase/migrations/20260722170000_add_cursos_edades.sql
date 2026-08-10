-- Course age groups are stored as an array because a course can target
-- more than one audience. Existing rows default to "todos".
alter table public.cursos
add column if not exists edades text[] default array['todos']::text[];

update public.cursos
set edades = array['todos']::text[]
where edades is null or cardinality(edades) = 0;

alter table public.cursos
alter column edades set default array['todos']::text[];

-- Ask PostgREST to immediately refresh its schema cache after deployment.
notify pgrst, 'reload schema';
