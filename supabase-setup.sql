create table if not exists public.kanxi_site_data (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.kanxi_site_data enable row level security;

drop policy if exists "Kanxi public read" on public.kanxi_site_data;
drop policy if exists "Kanxi public insert" on public.kanxi_site_data;
drop policy if exists "Kanxi public update" on public.kanxi_site_data;

create policy "Kanxi public read"
on public.kanxi_site_data
for select
to anon, authenticated
using (true);

create policy "Kanxi public insert"
on public.kanxi_site_data
for insert
to anon, authenticated
with check (true);

create policy "Kanxi public update"
on public.kanxi_site_data
for update
to anon, authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.kanxi_site_data to anon, authenticated;
