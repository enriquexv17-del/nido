-- ============================================================
-- Nido · TODAS las migraciones, en orden
-- Generado desde supabase/migrations/*.sql
-- Pegar completo en Supabase -> SQL Editor y ejecutar UNA vez.
-- No contiene claves ni datos de usuario.
-- ============================================================

-- >>> 20260101000001_extensions.sql

-- Nido · 0001 · Extensiones
-- pgcrypto aporta gen_random_uuid(); Supabase ya la trae disponible.

create extension if not exists pgcrypto;


-- >>> 20260101000002_tables_core.sql

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


-- >>> 20260101000003_members.sql

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


-- >>> 20260101000004_tables_data.sql

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


-- >>> 20260101000005_helpers.sql

-- Nido · 0005 · Funciones de apoyo

-- ¿El usuario de la sesión pertenece a este hogar?
create or replace function public.is_member_of(p_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.household_id = p_household and m.user_id = auth.uid()
  );
$$;

-- ¿El usuario de la sesión administra este hogar?
create or replace function public.is_admin_of(p_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.household_id = p_household and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- Genera un código legible y único tipo NIDO-XXXX (sin letras confusas).
create or replace function public.gen_household_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
begin
  loop
    result := 'NIDO-';
    for i in 1..4 loop
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.households where code = result);
  end loop;
  return result;
end;
$$;


-- >>> 20260101000006_triggers_members.sql

-- Nido · 0006 · Disparadores: máximo 3 integrantes, colores y actividad

-- Máximo 3 por hogar (forzado también por color no repetido y posición 1–3).
create or replace function public.members_before_write()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.members where household_id = new.household_id) >= 3 then
    raise exception 'MAX_MIEMBROS: el hogar ya tiene 3 personas';
  end if;
  if exists (
    select 1 from public.members
    where household_id = new.household_id and color = new.color
  ) then
    raise exception 'COLOR_REPETIDO: ese color ya está en uso';
  end if;
  new.position := coalesce(
    (select max(position) from public.members where household_id = new.household_id), 0
  ) + 1;
  return new;
end;
$$;

create trigger members_before_write
before insert on public.members
for each row execute function public.members_before_write();

-- Perfil automático cuando se crea un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, color)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email, '--p1')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- >>> 20260101000007_triggers_activity.sql

-- Nido · 0007 · Disparadores de actividad (se escribe sola al crear/editar/borrar)

create or replace function public.log_activity(
  p_household uuid,
  p_member uuid,
  p_icon text,
  p_text text,
  p_detail text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity (household_id, member_id, icon, text, detail)
  values (p_household, p_member, p_icon, p_text, p_detail);
$$;

-- Nombre del integrante que está actuando (por user_id de la sesión).
create or replace function public.current_member(p_household uuid)
returns table(id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.name
  from public.members m
  where m.household_id = p_household and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.expenses_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid := coalesce(new.household_id, old.household_id);
  v_member uuid;
  v_name text;
  v_amount numeric;
begin
  select c.id, c.name into v_member, v_name from public.current_member(v_household) c;
  v_name := coalesce(v_name, 'Alguien');

  if tg_op = 'INSERT' then
    v_amount := new.amount;
    perform public.log_activity(v_household, v_member, 'plus',
      v_name || ' agregó ' || new.name, '$' || to_char(v_amount, 'FM9999990.00') || ' · ahora');
  elsif tg_op = 'UPDATE' then
    v_amount := new.amount;
    perform public.log_activity(v_household, v_member, 'refresh',
      v_name || ' editó ' || new.name, '$' || to_char(v_amount, 'FM9999990.00') || ' · ahora');
  else
    perform public.log_activity(v_household, v_member, 'wallet',
      v_name || ' eliminó ' || old.name, 'ahora');
  end if;

  return coalesce(new, old);
end;
$$;

create trigger expenses_activity
after insert or update or delete on public.expenses
for each row execute function public.expenses_activity();


-- >>> 20260101000008_triggers_income_members.sql

-- Nido · 0008 · Actividad de sueldos e integrantes

create or replace function public.income_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid := coalesce(new.household_id, old.household_id);
  v_member uuid;
  v_name text;
begin
  select c.id, c.name into v_member, v_name from public.current_member(v_household) c;
  v_name := coalesce(v_name, 'Alguien');
  if tg_op = 'UPDATE' then
    perform public.log_activity(v_household, v_member, 'wallet',
      v_name || ' editó su sueldo', '$' || to_char(new.gross, 'FM9999990.00') || ' · ahora');
  else
    perform public.log_activity(v_household, v_member, 'wallet',
      v_name || ' anotó su sueldo', '$' || to_char(new.gross, 'FM9999990.00') || ' · ahora');
  end if;
  return coalesce(new, old);
end;
$$;

create trigger income_activity
after insert or update on public.income_entries
for each row execute function public.income_activity();

create or replace function public.members_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid := coalesce(new.household_id, old.household_id);
  v_actor uuid;
  v_name text;
begin
  select c.id, c.name into v_actor, v_name from public.current_member(v_household) c;
  v_name := coalesce(v_name, 'Alguien');
  if tg_op = 'INSERT' then
    perform public.log_activity(v_household, v_actor, 'plus', v_name || ' agregó a ' || new.name, 'ahora');
  else
    perform public.log_activity(v_household, v_actor, 'wallet', v_name || ' quitó a ' || old.name, 'ahora');
  end if;
  return coalesce(new, old);
end;
$$;

create trigger members_activity
after insert or delete on public.members
for each row execute function public.members_activity();


-- >>> 20260101000009_rls.sql

-- Nido · 0009 · Row Level Security (cada quien ve y toca solo su hogar)

alter table public.profiles        enable row level security;
alter table public.households      enable row level security;
alter table public.members         enable row level security;
alter table public.income_entries  enable row level security;
alter table public.expenses        enable row level security;
alter table public.activity        enable row level security;
alter table public.app_settings    enable row level security;

-- Perfiles: cada quien el suyo.
create policy profiles_select on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Hogares: los ve quien pertenece; borra quien lo creó.
create policy households_select on public.households
  for select using (public.is_member_of(id));
create policy households_insert on public.households
  for insert with check (auth.uid() = created_by);
create policy households_update on public.households
  for update using (public.is_member_of(id)) with check (public.is_member_of(id));
create policy households_delete on public.households
  for delete using (auth.uid() = created_by);

-- Integrantes: los ve y administra cualquier miembro del hogar.
create policy members_select on public.members
  for select using (public.is_member_of(household_id));
create policy members_insert on public.members
  for insert with check (public.is_member_of(household_id));
create policy members_update on public.members
  for update using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));
create policy members_delete on public.members
  for delete using (public.is_member_of(household_id) and public.is_admin_of(household_id));


-- >>> 20260101000010_rls_data.sql

-- Nido · 0010 · RLS de sueldos, gastos, actividad y ajustes

-- Sueldos: los ve todo el hogar; los edita su dueño (o quien administra).
create policy income_select on public.income_entries
  for select using (public.is_member_of(household_id));
create policy income_insert on public.income_entries
  for insert with check (
    public.is_member_of(household_id)
    and (
      public.is_admin_of(household_id)
      or exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
    )
  );
create policy income_update on public.income_entries
  for update using (
    public.is_member_of(household_id)
    and (
      public.is_admin_of(household_id)
      or exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
    )
  ) with check (
    public.is_member_of(household_id)
    and (
      public.is_admin_of(household_id)
      or exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
    )
  );

-- Gastos: todos los del hogar pueden agregar, editar y borrar.
create policy expenses_select on public.expenses
  for select using (public.is_member_of(household_id));
create policy expenses_insert on public.expenses
  for insert with check (public.is_member_of(household_id));
create policy expenses_update on public.expenses
  for update using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));
create policy expenses_delete on public.expenses
  for delete using (public.is_member_of(household_id));

-- Actividad: la lee el hogar; la escriben los disparadores.
create policy activity_select on public.activity
  for select using (public.is_member_of(household_id));
create policy activity_insert on public.activity
  for insert with check (public.is_member_of(household_id));

-- Ajustes: los lee cualquier usuario; los edita quien administra un hogar.
create policy settings_select on public.app_settings
  for select using (auth.uid() is not null);
create policy settings_update on public.app_settings
  for update using (
    exists (select 1 from public.members m where m.user_id = auth.uid() and m.role = 'admin')
  ) with check (
    exists (select 1 from public.members m where m.user_id = auth.uid() and m.role = 'admin')
  );


-- >>> 20260101000011_rpc_households.sql

-- Nido · 0011 · RPC de hogares (crear, unirse, vista previa)

-- Crea el hogar, al primer integrante como administrador y su perfil.
create or replace function public.create_household(
  p_name text,
  p_member_name text,
  p_color text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := coalesce(nullif(trim(p_member_name), ''), 'Yo');
  v_color text := coalesce(p_color, '--p1');
begin
  if auth.uid() is null then
    raise exception 'SIN_SESION: inicia sesión';
  end if;

  insert into public.households (name, code, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Mi hogar'), public.gen_household_code(), auth.uid())
  returning id into v_id;

  insert into public.members (household_id, user_id, name, color, role)
  values (v_id, auth.uid(), v_name, v_color, 'admin');

  insert into public.profiles (id, name, color, email)
  values (auth.uid(), v_name, v_color, (select email from auth.users where id = auth.uid()))
  on conflict (id) do update set name = excluded.name, color = excluded.color;

  return v_id;
end;
$$;

-- Vista previa del hogar por código (antes de unirse).
create or replace function public.preview_household(p_code text)
returns table(name text, count int)
language sql
stable
security definer
set search_path = public
as $$
  select h.name,
         (select count(*)::int from public.members m where m.household_id = h.id) as count
  from public.households h
  where upper(h.code) = upper(trim(p_code))
  limit 1;
$$;

-- Unirse a un hogar: valida cupo (máx. 3) y evita colores repetidos.
create or replace function public.join_household(
  p_code text,
  p_name text,
  p_color text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
  v_count int;
  v_name text := coalesce(nullif(trim(p_name), ''), 'Yo');
  v_color text := coalesce(p_color, '--p1');
begin
  if auth.uid() is null then
    raise exception 'SIN_SESION: inicia sesión';
  end if;

  select id into v_household from public.households where upper(code) = upper(trim(p_code));
  if v_household is null then
    raise exception 'CODIGO_INVALIDO: no existe ese código';
  end if;

  if exists (
    select 1 from public.members where household_id = v_household and user_id = auth.uid()
  ) then
    return v_household;
  end if;

  select count(*) into v_count from public.members where household_id = v_household;
  if v_count >= 3 then
    raise exception 'HOGAR_LLENO: el hogar ya tiene 3 personas';
  end if;

  if exists (
    select 1 from public.members where household_id = v_household and color = v_color
  ) then
    select c into v_color
    from unnest(array['--p1', '--p2', '--p3', '--pk']) c
    where c not in (select color from public.members where household_id = v_household)
    limit 1;
  end if;
  v_color := coalesce(v_color, '--p3');

  insert into public.members (household_id, user_id, name, color, role)
  values (v_household, auth.uid(), v_name, v_color, 'member');

  insert into public.profiles (id, name, color, email)
  values (auth.uid(), v_name, v_color, (select email from auth.users where id = auth.uid()))
  on conflict (id) do update set name = excluded.name, color = excluded.color;

  return v_household;
end;
$$;


-- >>> 20260101000012_rpc_misc.sql

-- Nido · 0012 · RPC varias (regenerar código, copiar mes, borrar cuenta)

-- Nuevo código para el hogar que administra el usuario.
create or replace function public.regenerate_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
  v_code text;
begin
  select household_id into v_household
  from public.members
  where user_id = auth.uid() and role = 'admin'
  order by created_at
  limit 1;

  if v_household is null then
    raise exception 'SIN_PERMISO: solo quien administra puede cambiar el código';
  end if;

  v_code := public.gen_household_code();
  update public.households set code = v_code where id = v_household;
  return v_code;
end;
$$;

-- Copia los sueldos de un mes a otro (reemplaza los del mes destino).
create or replace function public.copy_month(p_from text, p_to text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
begin
  select household_id into v_household
  from public.members
  where user_id = auth.uid()
  limit 1;

  if v_household is null then
    raise exception 'SIN_PERMISO: no perteneces a ningún hogar';
  end if;

  insert into public.income_entries
    (household_id, member_id, month, gross, afp_on, isss_on, isr_on, net)
  select v_household, member_id, p_to, gross, afp_on, isss_on, isr_on, net
  from public.income_entries
  where household_id = v_household and month = p_from
  on conflict (household_id, member_id, month) do update
    set gross = excluded.gross,
        afp_on = excluded.afp_on,
        isss_on = excluded.isss_on,
        isr_on = excluded.isr_on,
        net = excluded.net,
        updated_at = now();
end;
$$;

-- Elimina la cuenta del usuario y los hogares que creó.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'SIN_SESION: inicia sesión';
  end if;

  delete from public.households where created_by = v_uid;
  update public.members set user_id = null where user_id = v_uid;
  delete from public.profiles where id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;


-- >>> 20260101000013_realtime.sql

-- Nido · 0013 · Realtime (los cambios se difunden y la app los ve sin recargar)

do $$ begin
  alter publication supabase_realtime add table public.households;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.members;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.income_entries;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.expenses;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.activity;
exception when duplicate_object then null; end $$;


-- >>> 20260101000014_savings.sql

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

alter table public.other_incomes  enable row level security;
alter table public.savings_goals   enable row level security;
alter table public.savings_funds   enable row level security;

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

-- >>> 20260101000015_deductions.sql

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

alter table public.deductions enable row level security;

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

-- >>> 20260101000016_split.sql

-- Nido · 0016 · Fase 4: configuración de reparto del hogar
--
-- Guarda cómo se reparten los gastos: proporcional al sueldo neto, partes
-- iguales, porcentajes manuales o monto fijo por integrante. La apariencia
-- (modo claro/oscuro y acento) es una preferencia del dispositivo y vive en
-- `localStorage`, así que no necesita tabla.
--
-- (Migración escrita; no aplicada todavía.)

alter table public.households
  add column split_mode text not null default 'salary'
    check (split_mode in ('salary', 'equal', 'manual', 'fixed')),
  add column split_manual jsonb not null default '{}'::jsonb,  -- { memberId: pct }
  add column split_fixed jsonb not null default '{}'::jsonb;   -- { memberId: monto }

