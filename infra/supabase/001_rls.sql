-- Enable RLS and define policies.

alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.games enable row level security;
alter table public.videos enable row level security;
alter table public.plays enable row level security;
alter table public.markers enable row level security;
alter table public.jobs enable row level security;
alter table public.analysis_results enable row level security;

-- Orgs: members can select; owners/admin can update; insert controlled via init_user(); delete restricted
create policy "orgs_select_members" on public.orgs
  for select using (exists (select 1 from public.org_members m where m.org_id = id and m.user_id = auth.uid()));

create policy "orgs_update_owner_admin" on public.orgs
  for update using (exists (select 1 from public.org_members m where m.org_id = id and m.user_id = auth.uid() and m.role in ('owner','admin')));

-- Org members: user can see rows for orgs they belong to; only owners/admins can manage
create policy "org_members_select_self_orgs" on public.org_members
  for select using (exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = auth.uid()));

create policy "org_members_insert_owner_admin" on public.org_members
  for insert with check (exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "org_members_update_owner_admin" on public.org_members
  for update using (exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "org_members_delete_owner_admin" on public.org_members
  for delete using (exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

-- Profiles: user can see self; members of same org can select minimal data
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_same_org" on public.profiles
  for select using (exists (select 1 from public.org_members m1
                            join public.org_members m2 on m1.org_id = m2.org_id
                            where m1.user_id = profiles.id and m2.user_id = auth.uid()));

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- Boilerplate for org-scoped tables
-- Teams
create policy "teams_rw_members" on public.teams
  for all using (fn_is_org_member(org_id)) with check (fn_is_org_member(org_id));

-- Games
create policy "games_rw_members" on public.games
  for all using (fn_is_org_member(org_id)) with check (fn_is_org_member(org_id));

-- Videos
create policy "videos_rw_members" on public.videos
  for all using (fn_is_org_member(org_id)) with check (fn_is_org_member(org_id));

-- Plays
create policy "plays_rw_members" on public.plays
  for all using (fn_is_org_member(org_id)) with check (fn_is_org_member(org_id));

-- Markers
create policy "markers_rw_members" on public.markers
  for all using (fn_is_org_member(org_id)) with check (fn_is_org_member(org_id));

-- Jobs: members can read/write their org's jobs; service key may bypass for workers
create policy "jobs_rw_members" on public.jobs
  for all using (coalesce(org_id, uuid_nil()) is null or fn_is_org_member(org_id))
  with check (fn_is_org_member(org_id));

-- Analysis results
create policy "results_rw_members" on public.analysis_results
  for all using (fn_is_org_member(org_id)) with check (fn_is_org_member(org_id));
