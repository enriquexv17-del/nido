-- Nido · 0003 · Integrantes (máximo 3 por hogar, forzado en la base)

create table public.members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  color text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  position int not null default 1 check (position between 1 and 3),
  created_at timestamptz not null default now()
);

create index members_household_idx on public.members(household_id);
create index members_user_idx on public.members(user_id);
