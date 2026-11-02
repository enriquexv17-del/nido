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
