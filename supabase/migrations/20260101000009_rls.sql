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
