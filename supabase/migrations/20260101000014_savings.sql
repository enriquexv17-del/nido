-- Nido · 0014 · Fase 3: ingresos extra personales, metas y fondos de ahorro
--
-- Datos **personales**: cada persona ve y edita solo los suyos. No entran al
-- reparto del hogar. (Migración escrita; no aplicada todavía.)

/* ---------------- Otros ingresos (personales) ---------------- */

create table public.other_incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  month text not null,                                   -- 'YYYY-MM'
  source text not null,                                  -- "Marca de ropa"
  note text not null default '',                         -- qué fue
  amount numeric(12, 2) not null default 0,
  day int check (day is null or (day between 1 and 31)),
  created_at timestamptz not null default now()
);
create index other_incomes_member_month_idx
  on public.other_incomes(member_id, month, created_at);

/* ---------------- Metas de ahorro (personales) ---------------- */

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  name text not null,
  target numeric(12, 2) not null default 0,
  saved numeric(12, 2) not null default 0,
  frequency text not null default 'monthly'
    check (frequency in ('daily', 'weekly', 'monthly')),
  due_month text,                                        -- 'YYYY-MM' (opcional)
  created_at timestamptz not null default now()
);
create index savings_goals_member_idx
  on public.savings_goals(member_id, created_at);

/* ---------------- Fondos de ahorro automático (personales) ---------------- */

create table public.savings_funds (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  name text not null,
  pct numeric(5, 2) not null default 0 check (pct >= 0 and pct <= 100),
  note text,
  created_at timestamptz not null default now()
);
create index savings_funds_member_idx
  on public.savings_funds(member_id, created_at);

/* ---------------- RLS: solo el dueño ---------------- */

-- Otros ingresos
create policy other_incomes_select on public.other_incomes
  for select using (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );
create policy other_incomes_insert on public.other_incomes
  for insert with check (
    public.is_member_of(household_id)
    and exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );
create policy other_incomes_update on public.other_incomes
  for update using (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );
create policy other_incomes_delete on public.other_incomes
  for delete using (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );

-- Metas
create policy savings_goals_select on public.savings_goals
  for select using (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );
create policy savings_goals_insert on public.savings_goals
  for insert with check (
    public.is_member_of(household_id)
    and exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );
create policy savings_goals_update on public.savings_goals
  for update using (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );
create policy savings_goals_delete on public.savings_goals
  for delete using (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );

-- Fondos
create policy savings_funds_select on public.savings_funds
  for select using (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );
create policy savings_funds_insert on public.savings_funds
  for insert with check (
    public.is_member_of(household_id)
    and exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );
create policy savings_funds_update on public.savings_funds
  for update using (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );
create policy savings_funds_delete on public.savings_funds
  for delete using (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );