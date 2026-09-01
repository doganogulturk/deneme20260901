create table if not exists public.game_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Oyuncu',
  avatar_url text,
  game_mode text not null default 'turkey' check (game_mode in ('turkey', 'world')),
  score smallint not null check (score between 0 and 10),
  duration_ms integer not null check (duration_ms >= 0),
  best_streak smallint not null check (best_streak between 0 and 10),
  created_at timestamptz not null default now()
);

alter table public.game_results
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists game_mode text,
  add column if not exists duration_ms integer;

update public.game_results
set game_mode = 'turkey'
where game_mode is null;

update public.game_results
set duration_ms = 2147483647
where duration_ms is null;

update public.game_results
set display_name = 'Oyuncu'
where display_name is null;

alter table public.game_results
  alter column display_name set not null,
  alter column display_name set default 'Oyuncu',
  alter column game_mode set not null,
  alter column game_mode set default 'turkey',
  alter column duration_ms set not null;

alter table public.game_results
  drop constraint if exists game_results_game_mode_check,
  add constraint game_results_game_mode_check check (game_mode in ('turkey', 'world'));

create index if not exists game_results_user_id_game_mode_score_created_at_idx
on public.game_results (user_id, game_mode, score desc, duration_ms asc, best_streak desc, created_at asc);

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

drop view if exists public.leaderboard;

create view public.leaderboard
with (security_invoker = true)
as
select distinct on (user_id)
  user_id,
  display_name,
  avatar_url,
  game_mode,
  score,
  duration_ms,
  best_streak
from public.game_results
order by user_id, game_mode, score desc, duration_ms asc, best_streak desc, created_at asc;

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
