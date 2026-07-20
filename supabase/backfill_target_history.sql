-- =============================================================================
-- CALE / CalTrack — run in Supabase Dashboard → SQL Editor
-- =============================================================================
-- Part 1: schema additions (safe to re-run)
-- Part 2: backfill target_history for existing users
-- Part 3: fix lone snapshots seeded at "today" when older activity exists
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Part 1: New columns + tables (skip any block you already applied)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists adjustment_is_custom boolean not null default false;

alter table public.profiles
  add column if not exists maintenance_is_custom boolean not null default false;

create table if not exists public.target_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  effective_from date not null,
  daily_target_calories integer not null,
  maintenance_calories integer not null,
  unique (user_id, effective_from)
);

create index if not exists target_history_user_date_idx
  on public.target_history (user_id, effective_from desc);

alter table public.target_history enable row level security;

drop policy if exists "Users manage own target history" on public.target_history;
create policy "Users manage own target history"
  on public.target_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  log_date date not null,
  name text not null,
  calories_burned integer not null check (calories_burned > 0),
  duration_minutes integer,
  entry_mode text check (entry_mode in ('preset', 'custom')),
  workout_ref text,
  logged_at timestamptz not null default now()
);

create index if not exists workout_entries_user_date_idx
  on public.workout_entries (user_id, log_date desc);

alter table public.workout_entries enable row level security;

drop policy if exists "Users manage own workout entries" on public.workout_entries;
create policy "Users manage own workout entries"
  on public.workout_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Part 2: Seed target_history for onboarded users with no snapshots yet
-- Uses earliest meal / workout / weight log, else profile updated_at, else today.
-- ---------------------------------------------------------------------------

insert into public.target_history (
  user_id,
  effective_from,
  daily_target_calories,
  maintenance_calories
)
select
  p.id,
  coalesce(
    (
      select min(d)
      from (
        select min(ce.log_date) as d
        from public.calorie_entries ce
        where ce.user_id = p.id
        union all
        select min(we.log_date)
        from public.workout_entries we
        where we.user_id = p.id
        union all
        select min(wt.log_date)
        from public.weight_entries wt
        where wt.user_id = p.id
      ) dates
      where d is not null
    ),
    (p.updated_at at time zone 'UTC')::date,
    current_date
  ) as effective_from,
  p.daily_target_calories,
  p.maintenance_calories
from public.profiles p
where p.onboarding_complete = true
  and not exists (
    select 1
    from public.target_history th
    where th.user_id = p.id
  )
on conflict (user_id, effective_from) do nothing;

-- ---------------------------------------------------------------------------
-- Part 3: Fix users who already have a single snapshot dated too recently
-- (e.g. seeded at upgrade time instead of first activity date)
-- ---------------------------------------------------------------------------

with user_activity as (
  select
    p.id as user_id,
    coalesce(
      (
        select min(d)
        from (
          select min(ce.log_date) as d
          from public.calorie_entries ce
          where ce.user_id = p.id
          union all
          select min(we.log_date)
          from public.workout_entries we
          where we.user_id = p.id
          union all
          select min(wt.log_date)
          from public.weight_entries wt
          where wt.user_id = p.id
        ) dates
        where d is not null
      ),
      (p.updated_at at time zone 'UTC')::date
    ) as earliest_activity
  from public.profiles p
  where p.onboarding_complete = true
),
lonely_snapshots as (
  select
    th.id,
    th.user_id,
    th.effective_from,
    ua.earliest_activity
  from public.target_history th
  join user_activity ua on ua.user_id = th.user_id
  where th.effective_from > ua.earliest_activity
    and (
      select count(*)
      from public.target_history th2
      where th2.user_id = th.user_id
    ) = 1
)
update public.target_history th
set effective_from = ls.earliest_activity
from lonely_snapshots ls
where th.id = ls.id
  and not exists (
    select 1
    from public.target_history existing
    where existing.user_id = ls.user_id
      and existing.effective_from = ls.earliest_activity
      and existing.id <> ls.id
  );

-- If the UPDATE above skipped rows due to a conflicting date, remove the
-- too-recent lone row so the client can re-sync a corrected snapshot:
delete from public.target_history th
using (
  with user_activity as (
    select
      p.id as user_id,
      coalesce(
        (
          select min(d)
          from (
            select min(ce.log_date) as d
            from public.calorie_entries ce
            where ce.user_id = p.id
            union all
            select min(we.log_date)
            from public.workout_entries we
            where we.user_id = p.id
            union all
            select min(wt.log_date)
            from public.weight_entries wt
            where wt.user_id = p.id
          ) dates
          where d is not null
        ),
        (p.updated_at at time zone 'UTC')::date
      ) as earliest_activity
    from public.profiles p
    where p.onboarding_complete = true
  )
  select
    th_inner.id
  from public.target_history th_inner
  join user_activity ua on ua.user_id = th_inner.user_id
  where th_inner.effective_from > ua.earliest_activity
    and (
      select count(*)
      from public.target_history th2
      where th2.user_id = th_inner.user_id
    ) = 1
    and exists (
      select 1
      from public.target_history existing
      where existing.user_id = th_inner.user_id
        and existing.effective_from = ua.earliest_activity
        and existing.id <> th_inner.id
    )
) conflicts
where th.id = conflicts.id;
