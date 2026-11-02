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
