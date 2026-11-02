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
