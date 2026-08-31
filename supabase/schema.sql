create table if not exists public.game_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Oyuncu',
  score smallint not null check (score between 0 and 10),
  best_streak smallint not null check (best_streak between 0 and 10),
  created_at timestamptz not null default now()
);

alter table public.game_results
  add column if not exists display_name text;

update public.game_results
set display_name = 'Oyuncu'
where display_name is null;

alter table public.game_results
  alter column display_name set not null,
  alter column display_name set default 'Oyuncu';

create index if not exists game_results_user_id_score_created_at_idx
on public.game_results (user_id, score desc, best_streak desc, created_at asc);

alter table public.game_results enable row level security;

drop policy if exists "Users can read their own results" on public.game_results;
drop policy if exists "Authenticated users can read results" on public.game_results;
drop policy if exists "Users can create their own results" on public.game_results;

create policy "Authenticated users can read results"
on public.game_results
for select
to authenticated
using (true);

create policy "Users can create their own results"
on public.game_results
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create or replace view public.leaderboard
with (security_invoker = true)
as
select distinct on (user_id)
  user_id,
  display_name,
  score,
  best_streak
from public.game_results
order by user_id, score desc, best_streak desc, created_at asc;

alter table public.game_results replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_results'
  ) then
    alter publication supabase_realtime add table public.game_results;
  end if;
end;
$$;

notify pgrst, 'reload schema';
