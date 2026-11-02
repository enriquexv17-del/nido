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
