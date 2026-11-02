-- Nido · 0004 · Sueldos, gastos, actividad y ajustes

create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  month text not null,                                   -- 'YYYY-MM'
  gross numeric(12, 2) not null default 0,
  afp_on boolean not null default false,
  isss_on boolean not null default false,
  isr_on boolean not null default false,
  net numeric(12, 2) not null default 0,                 -- neto calculado
  updated_at timestamptz not null default now(),
  unique (household_id, member_id, month)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  icon text not null default 'wallet',
  type text not null default 'monthly' check (type in ('monthly', 'daily')),
  amount numeric(12, 2) not null default 0,
  per_day numeric(12, 2),
  days int default 30,
  member_ids uuid[] not null default '{}',               -- entre quiénes se reparte
  month text not null,
  created_at timestamptz not null default now()
);
create index expenses_household_month_idx on public.expenses(household_id, month);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  icon text not null default 'wallet',
  text text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index activity_household_idx on public.activity(household_id, created_at desc);

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  afp_rate numeric(6, 4) not null default 0.0725,
  isss_rate numeric(6, 4) not null default 0.0300,
  isss_max_base numeric(12, 2) not null default 1000,
  isss_cap numeric(12, 2) not null default 30,
  isr_brackets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;
