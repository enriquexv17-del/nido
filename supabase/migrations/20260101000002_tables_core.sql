-- Nido · 0002 · Tablas raíz (perfiles y hogares)

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  color text not null default '--p1',
  email text,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  currency text not null default 'US$',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
