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
