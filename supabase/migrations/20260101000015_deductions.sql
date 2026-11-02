-- Nido · 0015 · Fase 4: descuentos editables del hogar
--
-- Los descuentos son del **hogar** (AFP, ISSS, Renta y los personalizados como
-- préstamo, seguro privado o pensión alimenticia). Cada persona sigue pudiendo
-- encender/apagar los de ley en su propio sueldo desde `income_entries`.
--
-- (Migración escrita; no aplicada todavía.)

create table public.deductions (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  key text,                                              -- 'afp' | 'isss' | 'isr' (ley)
  name text not null,
  type text not null check (type in ('percent', 'fixed', 'bracket')),
  value numeric(12, 4) not null default 0,               -- tasa o monto fijo
  max_base numeric(12, 2),                               -- base máxima (opcional)
  cap numeric(12, 2),                                    -- tope del descuento (opcional)
  active boolean not null default true,
  is_law boolean not null default false,
  sort_order int not null default 0,
  brackets jsonb,                                        -- tramos (tabla progresiva)
  verify boolean not null default false,                 -- marca «verificar»
  created_at timestamptz not null default now(),
  unique (household_id, key)
);

create index deductions_household_idx
  on public.deductions(household_id, sort_order);

/* ---------------- Valores de ley por defecto ---------------- */

-- Se siembran al crear un hogar para que las ediciones se puedan guardar.
create or replace function public.seed_law_deductions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.deductions
    (id, household_id, key, name, type, value, max_base, cap, active, is_law, sort_order, brackets, verify)
  values
    ('law-afp-' || new.id, new.id, 'afp', 'AFP · pensión', 'percent',
     0.0725, 7045.06, null, true, true, 1, null, true),
    ('law-isss-' || new.id, new.id, 'isss', 'ISSS · seguro social', 'percent',
     0.03, 1000, 30, true, true, 2, null, false),
    ('law-isr-' || new.id, new.id, 'isr', 'Renta (ISR)', 'bracket',
     0, null, null, true, true, 3,
     '[{"from":0.01,"to":550,"rate":0,"over":0,"fixed":0},
       {"from":550.01,"to":895.24,"rate":0.1,"over":550,"fixed":17.67},
       {"from":895.25,"to":2038.1,"rate":0.2,"over":895.24,"fixed":60},
       {"from":2038.11,"to":null,"rate":0.3,"over":2038.1,"fixed":288.57}]'::jsonb,
     false)
  on conflict (household_id, key) do nothing;
  return new;
end;
$$;

drop trigger if exists households_seed_deductions on public.households;
create trigger households_seed_deductions
  after insert on public.households
  for each row execute function public.seed_law_deductions();

-- Rellena los hogares que ya existían antes de esta migración.
insert into public.deductions
  (id, household_id, key, name, type, value, max_base, cap, active, is_law, sort_order, brackets, verify)
select
  'law-afp-' || h.id, h.id, 'afp', 'AFP · pensión', 'percent',
  0.0725, 7045.06, null, true, true, 1, null, true
from public.households h
on conflict (household_id, key) do nothing;

insert into public.deductions
  (id, household_id, key, name, type, value, max_base, cap, active, is_law, sort_order, brackets, verify)
select
  'law-isss-' || h.id, h.id, 'isss', 'ISSS · seguro social', 'percent',
  0.03, 1000, 30, true, true, 2, null, false
from public.households h
on conflict (household_id, key) do nothing;

insert into public.deductions
  (id, household_id, key, name, type, value, max_base, cap, active, is_law, sort_order, brackets, verify)
select
  'law-isr-' || h.id, h.id, 'isr', 'Renta (ISR)', 'bracket',
  0, null, null, true, true, 3,
  '[{"from":0.01,"to":550,"rate":0,"over":0,"fixed":0},
    {"from":550.01,"to":895.24,"rate":0.1,"over":550,"fixed":17.67},
    {"from":895.25,"to":2038.1,"rate":0.2,"over":895.24,"fixed":60},
    {"from":2038.11,"to":null,"rate":0.3,"over":2038.1,"fixed":288.57}]'::jsonb,
  false
from public.households h
on conflict (household_id, key) do nothing;

/* ---------------- RLS: todo el hogar puede ver y editar ---------------- */

create policy deductions_select on public.deductions
  for select using (public.is_member_of(household_id));

create policy deductions_insert on public.deductions
  for insert with check (public.is_member_of(household_id));

create policy deductions_update on public.deductions
  for update using (public.is_member_of(household_id))
  with check (public.is_member_of(household_id));

create policy deductions_delete on public.deductions
  for delete using (public.is_member_of(household_id));

/* ---------------- Realtime ---------------- */

do $$ begin
  alter publication supabase_realtime add table public.deductions;
exception when duplicate_object then null; end $$;