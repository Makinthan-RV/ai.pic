-- AI Event Photo Finder — SaaS schema (Supabase Postgres)
-- Run this in the Supabase SQL editor.
--
-- Design notes:
--  * Photographers are Supabase Auth users. `profiles` extends auth.users.
--  * Every event belongs to a photographer (user_id). Multi-tenant isolation
--    is enforced with Row Level Security (RLS) so one photographer can never
--    see another's events/images.
--  * `images.id` is the SAME id the Python AI service assigns when it indexes
--    a photo, so /match results (which return image_id) map straight back to
--    the R2 url stored here. See web/src/app/api/event/upload/route.ts.
--  * The face embeddings/vectors live in the Python AI service, NOT here.
--    This table stores business/metadata only. (pgvector can be added later
--    if you migrate matching into Postgres.)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (photographers) — 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  event_date  date,
  created_at  timestamptz not null default now()
);
create index if not exists idx_events_user on public.events(user_id);

-- ---------------------------------------------------------------------------
-- images (metadata; canonical file lives in R2)
-- ---------------------------------------------------------------------------
create table if not exists public.images (
  id          uuid primary key,          -- matches AI service image_id
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  image_url   text not null,             -- public R2 url
  storage_key text not null,             -- object key in the R2 bucket
  face_count  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_images_event on public.images(event_id);

-- ---------------------------------------------------------------------------
-- matches (audit log of guest selfie lookups; optional but useful analytics)
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  image_id    uuid not null references public.images(id) on delete cascade,
  score       real not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_matches_event on public.matches(event_id);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles enable row level security;
alter table public.events   enable row level security;
alter table public.images   enable row level security;
alter table public.matches  enable row level security;

-- profiles: a user can read/update only their own profile.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- events: owner-only access.
drop policy if exists "own events" on public.events;
create policy "own events" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- images: owner-only access.
drop policy if exists "own images" on public.images;
create policy "own images" on public.images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- matches: readable by the owning photographer (via the event).
drop policy if exists "own matches" on public.matches;
create policy "own matches" on public.matches
  for select using (
    exists (
      select 1 from public.events e
      where e.id = matches.event_id and e.user_id = auth.uid()
    )
  );

-- NOTE: The guest flow (selfie match + gallery) runs through server-side API
-- routes using the SERVICE ROLE key, which bypasses RLS. That is intentional:
-- guests are anonymous and must read a single event's matched photos without a
-- login. All guest access is scoped by event_id in the API layer.
