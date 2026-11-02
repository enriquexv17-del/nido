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
