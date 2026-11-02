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
