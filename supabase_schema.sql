-- PASSO — Supabase setup. Run once in Supabase > SQL Editor. Safe to run again.

-- ============ RESERVATIONS (signed-in guests only) ============
create table if not exists public.reservations (
  id bigint generated always as identity primary key,
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  res_date date not null,
  res_time time not null,
  guests smallint not null check (guests between 1 and 10),
  notes text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);
create index if not exists reservations_user_idx on public.reservations (user_id, res_date desc);
alter table public.reservations enable row level security;

drop policy if exists "own select" on public.reservations;
drop policy if exists "own insert" on public.reservations;
drop policy if exists "own update" on public.reservations;
create policy "own select" on public.reservations for select to authenticated using (auth.uid() = user_id);
create policy "own insert" on public.reservations for insert to authenticated with check (auth.uid() = user_id);
create policy "own update" on public.reservations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ REVIEWS (anyone can read approved reviews and submit one) ============
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 10 and 1000),
  approved boolean not null default true,   -- set the default to false if you want to approve reviews by hand
  created_at timestamptz not null default now()
);
create index if not exists reviews_created_idx on public.reviews (created_at desc);
alter table public.reviews enable row level security;

drop policy if exists "public read approved" on public.reviews;
drop policy if exists "anyone can submit" on public.reviews;
create policy "public read approved" on public.reviews for select to anon, authenticated using (approved);
create policy "anyone can submit" on public.reviews for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());