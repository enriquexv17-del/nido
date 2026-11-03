-- Nido · 0017 · Endurecimiento de seguridad (Fase 5A+)
--
-- Se puede ejecutar SOLA sobre una base que ya tiene aplicadas las migraciones
-- 1–16: no toca tablas ni datos existentes, solo políticas, permisos y
-- funciones. Es idempotente en lo posible (`drop ... if exists`).
--
-- No modifica ninguna migración anterior. Para proyectos nuevos, el archivo
-- `supabase/all_migrations.sql` ya la incluye al final.

/* ============================================================
   1. app_settings: nadie edita los ajustes globales desde el cliente
   ============================================================ */
-- La política original permitía a cualquier admin de cualquier hogar editar
-- la fila global (id = 1). La app NUNCA lee ni escribe esta tabla: los valores
-- de ley viven en el cliente (`src/lib/calc/settings.ts`) y, por hogar, en
-- `public.deductions`. Se elimina la escritura y se conserva la lectura.
drop policy if exists settings_update on public.app_settings;

/* ============================================================
   2. members: solo un admin cambia role o user_id
   ============================================================ */
-- Antes: cualquier miembro podía insertar/editar cualquier ficha, incluido
-- su propio `role` o `user_id` (ascenso de privilegios).
--
-- Las funciones `create_household`, `join_household` y `delete_my_account`
-- son `security definer`, así que NO se ven afectadas por estas políticas.
drop policy if exists members_insert on public.members;
drop policy if exists members_update on public.members;

-- Insertar: un admin del hogar, o cualquier miembro creando una ficha sin
-- cuenta (rol `member` y sin `user_id`). Una ficha nueva nunca puede traer
-- rol `admin` ni un `user_id` ajeno.
create policy members_insert on public.members
  for insert with check (
    public.is_admin_of(household_id)
    or (role = 'member' and user_id is null)
  );

-- Editar: un admin edita cualquier ficha; un miembro solo la suya.
create policy members_update on public.members
  for update using (
    public.is_admin_of(household_id) or user_id = auth.uid()
  ) with check (
    public.is_admin_of(household_id) or user_id = auth.uid()
  );

-- Refuerzo por columnas. Las políticas comparan la fila resultante, pero no
-- pueden comparar la fila vieja con la nueva: sin esto, un miembro podría
-- cambiar su propio `role` a `admin` (la política no lo impide) o apropiarse
-- de otro `user_id`. Este disparador lo bloquea.
--
-- Es `security invoker` (sin `security definer`) a propósito: así `current_user`
-- refleja a quien hace la operación. Las funciones `security definer` corren
-- como su dueño, por eso las operaciones internas (crear/unirse/borrar cuenta)
-- pasan de largo. `service_role` y el SQL Editor tampoco se ven afectados.
create or replace function public.members_guard_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Roles internos (postgres, service_role…) y cuerpos `security definer`.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Un miembro normal solo puede crear fichas sin cuenta.
    if not public.is_admin_of(new.household_id) then
      new.role := 'member';
      new.user_id := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if public.is_admin_of(old.household_id) then
    return new; -- quien administra puede cambiar role y user_id
  end if;

  if old.user_id is distinct from auth.uid() then
    raise exception 'SIN_PERMISO: solo puedes editar tu propia ficha';
  end if;

  if new.role is distinct from old.role
     or new.user_id is distinct from old.user_id
     or new.household_id is distinct from old.household_id then
    raise exception 'SIN_PERMISO: no puedes cambiar el rol ni la cuenta del integrante';
  end if;

  return new;
end;
$$;

drop trigger if exists members_guard_privileges on public.members;
create trigger members_guard_privileges
  before insert or update on public.members
  for each row execute function public.members_guard_privileges();

/* ============================================================
   3. activity: solo la escriben los disparadores
   ============================================================ */
-- Se quita la política de INSERT: `log_activity` es `security definer` y su
-- dueño (el de la tabla) no está sujeto a RLS, así que la actividad se sigue
-- registrando sola, pero ningún cliente puede insertar filas a mano.
drop policy if exists activity_insert on public.activity;

/* ============================================================
   4. Códigos de hogar de 8 caracteres (NIDO-XXXXXXXX)
   ============================================================ */
-- Mismo alfabeto sin letras confusas. Los códigos ya existentes siguen siendo
-- válidos: nada compara por longitud. La UI acepta cualquier largo (pide 4+
-- caracteres y no limita el máximo).
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
    for i in 1..8 loop
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.households where code = result);
  end loop;
  return result;
end;
$$;

/* ============================================================
   5. log_activity: no romper el borrado en cascada del hogar
   ============================================================ */
-- Al borrar la cuenta de un dueño se borra su hogar y, en cascada, gastos e
-- integrantes. Los disparadores de actividad intentaban escribir una fila de
-- `activity` con un `household_id` que ya no existía → violación de clave
-- foránea y el borrado fallaba. Con esta guarda, si el hogar ya no está, se
-- omite el registro y el borrado termina bien.
create or replace function public.log_activity(
  p_household uuid,
  p_member uuid,
  p_icon text,
  p_text text,
  p_detail text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.households where id = p_household) then
    return;
  end if;
  insert into public.activity (household_id, member_id, icon, text, detail)
  values (p_household, p_member, p_icon, p_text, p_detail);
end;
$$;

/* ============================================================
   6. Permisos de funciones
   ============================================================ */
-- `log_activity` y `current_member` solo las usan los disparadores (que corren
-- como su dueño). El cliente no debe poder llamarlas.
revoke execute on function public.log_activity(uuid, uuid, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.current_member(uuid)
  from public, anon, authenticated;

-- Las RPC de hogar: se cierra el acceso anónimo y se conserva `authenticated`
-- (la app siempre las llama con sesión).
revoke execute on function public.preview_household(text)      from public, anon;
revoke execute on function public.join_household(text, text, text) from public, anon;
revoke execute on function public.create_household(text, text, text) from public, anon;
revoke execute on function public.regenerate_code()            from public, anon;
revoke execute on function public.copy_month(text, text)       from public, anon;
revoke execute on function public.delete_my_account()          from public, anon;

grant execute on function public.preview_household(text) to authenticated;
grant execute on function public.join_household(text, text, text) to authenticated;
grant execute on function public.create_household(text, text, text) to authenticated;
grant execute on function public.regenerate_code() to authenticated;
grant execute on function public.copy_month(text, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- `is_member_of` / `is_admin_of` se dejan con EXECUTE porque las políticas RLS
-- las evalúan como el usuario de la sesión.
