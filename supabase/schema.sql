create table if not exists public.games (
  code text primary key,
  state jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

alter table public.games
  add column if not exists last_active_at timestamptz not null default now();

create index if not exists games_last_active_at_idx
  on public.games (last_active_at);

create table if not exists public.player_statistics (
  player_name text primary key check (player_name in ('Max','Tom','Claudia','Hannes','Marleen','Clara','Ralf','Sabine','Gast 1','Gast 2','Gast 3')),
  games_played integer not null default 0,
  rounds_played integer not null default 0,
  wins integer not null default 0,
  total_points integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.player_statistics
  drop constraint if exists player_statistics_player_name_check;

alter table public.player_statistics
  add constraint player_statistics_player_name_check
  check (player_name in ('Max','Tom','Claudia','Hannes','Marleen','Clara','Ralf','Sabine','Gast 1','Gast 2','Gast 3'));

alter table public.games enable row level security;
alter table public.player_statistics enable row level security;

create or replace function public.record_game_result(
  p_player_name text,
  p_games integer,
  p_rounds integer,
  p_wins integer,
  p_points integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into player_statistics (player_name, games_played, rounds_played, wins, total_points)
  values (p_player_name, p_games, p_rounds, p_wins, p_points)
  on conflict (player_name) do update set
    games_played = player_statistics.games_played + excluded.games_played,
    rounds_played = player_statistics.rounds_played + excluded.rounds_played,
    wins = player_statistics.wins + excluded.wins,
    total_points = player_statistics.total_points + excluded.total_points,
    updated_at = now();
end;
$$;

revoke all on function public.record_game_result(text, integer, integer, integer, integer) from public, anon, authenticated;

create or replace view public.leaderboard as
select
  player_name,
  games_played,
  rounds_played,
  wins,
  total_points,
  round(total_points::numeric / nullif(rounds_played, 0), 1) as average_per_round,
  round(total_points::numeric / nullif(games_played, 0), 1) as average_per_game
from public.player_statistics;

revoke all on public.games from anon, authenticated;
revoke all on public.player_statistics from anon, authenticated;

-- Entfernt Partien, die seit mindestens einer Stunde auf keinem Gerät mehr
-- geöffnet sind. Da die Zeile direkt gelöscht wird, fließt die Partie nicht
-- in die Statistik ein. Der Auftrag läuft alle zehn Minuten.
create extension if not exists pg_cron;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'cleanup-inactive-racko-games'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'cleanup-inactive-racko-games',
    '*/10 * * * *',
    $cleanup$delete from public.games where last_active_at < now() - interval '1 hour'$cleanup$
  );
end
$$;
