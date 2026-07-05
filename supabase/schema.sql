-- Calo / CalTrack Supabase schema
-- Run this in Supabase Dashboard → SQL Editor

-- Profiles (one row per user, keyed by auth.users.id)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  weight_kg double precision not null,
  height_cm double precision not null,
  age integer not null,
  gender text not null check (gender in ('male', 'female')),
  activity_level text not null,
  maintenance_calories integer not null,
  goal_type text not null check (goal_type in ('lose', 'gain', 'maintain')),
  goal_weight_kg double precision not null,
  calorie_adjustment integer not null default 0,
  daily_target_calories integer not null,
  weight_unit text not null default 'kg',
  height_unit text not null default 'cm',
  onboarding_complete boolean not null default false,
  reminder_enabled boolean default false,
  reminder_time_minutes integer,
  last_weight_prompt_date date,
  updated_at timestamptz not null default now()
);

-- Calorie log entries
create table if not exists public.calorie_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  log_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  calories integer not null check (calories > 0),
  entry_mode text check (entry_mode in ('food', 'custom')),
  food_name text,
  food_id text,
  serving_label text,
  logged_at timestamptz not null default now()
);

create index if not exists calorie_entries_user_date_idx
  on public.calorie_entries (user_id, log_date desc);

-- User-saved custom foods
create table if not exists public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  calories integer not null check (calories > 0),
  serving_label text not null default '1 serving',
  created_at timestamptz not null default now()
);

create index if not exists custom_foods_user_idx
  on public.custom_foods (user_id, created_at desc);

-- Weight check-ins
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  log_date date not null,
  weight_kg double precision not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.calorie_entries enable row level security;
alter table public.custom_foods enable row level security;
alter table public.weight_entries enable row level security;

create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users manage own calorie entries"
  on public.calorie_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own custom foods"
  on public.custom_foods for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own weight entries"
  on public.weight_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create empty profile row on signup (optional trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, weight_kg, height_cm, age, gender, activity_level,
    maintenance_calories, goal_type, goal_weight_kg, calorie_adjustment,
    daily_target_calories, onboarding_complete
  ) values (
    new.id, 70, 170, 25, 'male', 'sedentary',
    2000, 'maintain', 70, 0, 2000, false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
