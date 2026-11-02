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
