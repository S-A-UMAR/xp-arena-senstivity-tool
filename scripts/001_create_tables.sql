-- XP Arena Sensitivity Tool - Database Schema
-- Run this migration to set up all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  favorite_game text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_public_read" on public.profiles for select using (true);

-- ============================================
-- GAMES TABLE
-- ============================================
create table if not exists public.games (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  icon_url text,
  description text,
  sensitivity_fields jsonb not null default '[]',
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.games enable row level security;
create policy "games_public_read" on public.games for select using (true);

-- ============================================
-- DEVICES TABLE
-- ============================================
create table if not exists public.devices (
  id uuid primary key default uuid_generate_v4(),
  brand text not null,
  model text not null,
  display_name text not null,
  screen_size numeric(4,2),
  refresh_rate integer default 60,
  touch_sampling_rate integer,
  processor text,
  ram_options jsonb default '[]',
  is_tablet boolean default false,
  popularity_score integer default 0,
  created_at timestamptz default now(),
  unique(brand, model)
);

alter table public.devices enable row level security;
create policy "devices_public_read" on public.devices for select using (true);

-- ============================================
-- VENDORS TABLE
-- ============================================
create table if not exists public.vendors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  slug text unique not null,
  logo_url text,
  banner_url text,
  description text,
  social_links jsonb default '{}',
  theme_color text default '#00f0ff',
  is_verified boolean default false,
  is_active boolean default true,
  total_codes_generated integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.vendors enable row level security;
create policy "vendors_public_read" on public.vendors for select using (is_active = true);
create policy "vendors_own_update" on public.vendors for update using (auth.uid() = user_id);

-- ============================================
-- VAULT CODES TABLE
-- ============================================
create table if not exists public.vault_codes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  vendor_id uuid references public.vendors(id) on delete set null,
  code_type text not null check (code_type in ('user', 'vendor', 'admin')),
  max_uses integer,
  current_uses integer default 0,
  expires_at timestamptz,
  is_active boolean default true,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.vault_codes enable row level security;
create policy "vault_codes_public_validate" on public.vault_codes for select using (true);

-- ============================================
-- CALIBRATIONS TABLE
-- ============================================
create table if not exists public.calibrations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  vault_code_id uuid references public.vault_codes(id) on delete set null,
  game_id uuid references public.games(id) on delete cascade not null,
  device_id uuid references public.devices(id) on delete set null,
  
  -- Input parameters
  device_name text,
  ram_gb integer,
  screen_size numeric(4,2),
  grip_style text check (grip_style in ('claw', 'thumbs', 'hybrid', '3finger', '4finger', '5finger', '6finger')),
  play_style text check (play_style in ('aggressive', 'balanced', 'passive', 'sniper')),
  hand_size text check (hand_size in ('small', 'medium', 'large')),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced', 'pro')),
  
  -- Calculated sensitivity values
  sensitivity_values jsonb not null default '{}',
  
  -- Metadata
  calibration_score numeric(5,2),
  share_code text unique,
  is_public boolean default false,
  views_count integer default 0,
  saves_count integer default 0,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.calibrations enable row level security;
create policy "calibrations_public_read" on public.calibrations for select using (is_public = true or auth.uid() = user_id);
create policy "calibrations_own_insert" on public.calibrations for insert with check (auth.uid() = user_id or user_id is null);
create policy "calibrations_own_update" on public.calibrations for update using (auth.uid() = user_id);
create policy "calibrations_own_delete" on public.calibrations for delete using (auth.uid() = user_id);

-- ============================================
-- SAVED CALIBRATIONS (User Favorites)
-- ============================================
create table if not exists public.saved_calibrations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  calibration_id uuid references public.calibrations(id) on delete cascade not null,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, calibration_id)
);

alter table public.saved_calibrations enable row level security;
create policy "saved_own_read" on public.saved_calibrations for select using (auth.uid() = user_id);
create policy "saved_own_insert" on public.saved_calibrations for insert with check (auth.uid() = user_id);
create policy "saved_own_delete" on public.saved_calibrations for delete using (auth.uid() = user_id);

-- ============================================
-- TUTORIALS TABLE
-- ============================================
create table if not exists public.tutorials (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references public.games(id) on delete cascade,
  title text not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  duration_seconds integer,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  category text check (category in ('sensitivity', 'aim', 'movement', 'strategy', 'settings')),
  views_count integer default 0,
  is_featured boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.tutorials enable row level security;
create policy "tutorials_public_read" on public.tutorials for select using (true);

-- ============================================
-- COMPARISONS TABLE
-- ============================================
create table if not exists public.comparisons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  name text,
  calibration_ids uuid[] not null,
  share_code text unique,
  created_at timestamptz default now()
);

alter table public.comparisons enable row level security;
create policy "comparisons_public_read" on public.comparisons for select using (true);
create policy "comparisons_own_insert" on public.comparisons for insert with check (auth.uid() = user_id or user_id is null);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
create index if not exists idx_calibrations_user on public.calibrations(user_id);
create index if not exists idx_calibrations_game on public.calibrations(game_id);
create index if not exists idx_calibrations_share_code on public.calibrations(share_code);
create index if not exists idx_vault_codes_code on public.vault_codes(code);
create index if not exists idx_devices_brand on public.devices(brand);
create index if not exists idx_tutorials_game on public.tutorials(game_id);

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', null),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================
-- TRIGGER: Update timestamps
-- ============================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at();

drop trigger if exists update_calibrations_updated_at on public.calibrations;
create trigger update_calibrations_updated_at
  before update on public.calibrations
  for each row
  execute function public.update_updated_at();

drop trigger if exists update_vendors_updated_at on public.vendors;
create trigger update_vendors_updated_at
  before update on public.vendors
  for each row
  execute function public.update_updated_at();
