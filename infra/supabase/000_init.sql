-- Initial schema for GridIronIQ
-- Idempotent-ish: safe to re-run if objects already exist.

create extension if not exists "pgcrypto";

-- Helper: check org membership
create or replace function public.fn_is_org_member(p_org uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.org_members m
    where m.org_id = p_org
      and m.user_id = auth.uid()
  );
$$;

-- Orgs
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

-- Org members
create table if not exists public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Profiles (1:1 with auth user)
create table if not exists public.profiles (
  id uuid primary key, -- must equal auth.uid()
  display_name text,
  created_at timestamptz not null default now()
);

-- Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Games
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  opponent text,
  played_on date,
  created_at timestamptz not null default now()
);

-- Videos (metadata only; actual files in Storage)
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid not null, -- uploader
  storage_path text not null, -- e.g., user/<uid>/clips/clip-123.mp4
  created_at timestamptz not null default now()
);

-- Plays
create table if not exists public.plays (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  video_id uuid references public.videos(id) on delete set null,
  name text,
  created_at timestamptz not null default now()
);

-- Markers
create table if not exists public.markers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  play_id uuid references public.plays(id) on delete cascade,
  user_id uuid not null,
  x double precision not null check (x >= 0 and x <= 1),
  y double precision not null check (y >= 0 and y <= 1),
  timestamp_seconds double precision not null check (timestamp_seconds >= 0),
  position text not null,
  created_at timestamptz not null default now()
);

-- Analysis jobs (async pipeline controller)
create table if not exists public.jobs (
  id uuid primary key,
  org_id uuid references public.orgs(id) on delete cascade,
  created_by uuid,
  status text not null check (status in ('queued','processing','completed','failed')),
  submitted_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Analysis results
create table if not exists public.analysis_results (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  org_id uuid references public.orgs(id) on delete cascade,
  result_metrics jsonb,
  coaching_insight text,
  completed_at timestamptz
);

-- Useful indexes
create index if not exists idx_org_members_user on public.org_members(user_id);
create index if not exists idx_teams_org on public.teams(org_id);
create index if not exists idx_games_org on public.games(org_id);
create index if not exists idx_videos_org on public.videos(org_id);
create index if not exists idx_plays_org on public.plays(org_id);
create index if not exists idx_markers_org on public.markers(org_id);
create index if not exists idx_jobs_org on public.jobs(org_id);
create index if not exists idx_results_org on public.analysis_results(org_id);

-- RPC: initialize profile + a default org & membership
-- SECURITY DEFINER so it can insert into orgs/org_members with caller's uid
create or replace function public.init_user(p_org_name text default 'My Team')
returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
begin
  if v_uid is null then
    raise exception 'auth.uid() is null';
  end if;

  -- Create profile if missing
  insert into public.profiles (id, display_name)
  values (v_uid, null)
  on conflict (id) do nothing;

  -- Create an org if caller has none
  select m.org_id into v_org_id
  from public.org_members m
  where m.user_id = v_uid
  limit 1;

  if v_org_id is null then
    insert into public.orgs (name, created_by)
    values (coalesce(p_org_name, 'My Team'), v_uid)
    returning id into v_org_id;

    insert into public.org_members (org_id, user_id, role)
    values (v_org_id, v_uid, 'owner');
  end if;
end;
$$;

-- Grants
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.init_user(text) to authenticated;
