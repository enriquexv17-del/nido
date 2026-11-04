-- Nido · 0018 · Sincronización completa en tiempo real
--
-- ⚠️ MIGRACIÓN ESCRITA, NO APLICADA. Mario debe aplicarla en Supabase
--    (SQL Editor → pegar este archivo → Run).
--
-- Qué arregla:
--   1. Las tablas de la Fase 3 (`other_incomes`, `savings_goals`,
--      `savings_funds`) no estaban en la publicación `supabase_realtime`.
--      Sin esto, un cambio hecho en otro dispositivo no aparece hasta recargar.
--   2. `replica identity full`: con `identity default`, los BORRADOS no traen la
--      fila completa y la RLS los descarta, así que quitar un gasto o un
--      integrante en un dispositivo no se veía en los demás.
--
-- Es idempotente: se puede aplicar más de una vez sin error.

-- 1) Tablas que faltaban en Realtime.
do $$ begin
  alter publication supabase_realtime add table public.other_incomes;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.savings_goals;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.savings_funds;
exception when duplicate_object then null; end $$;

-- 2) Los borrados necesitan la fila completa para pasar la RLS.
alter table public.households     replica identity full;
alter table public.members        replica identity full;
alter table public.income_entries replica identity full;
alter table public.expenses       replica identity full;
alter table public.activity       replica identity full;
alter table public.deductions     replica identity full;
alter table public.other_incomes  replica identity full;
alter table public.savings_goals  replica identity full;
alter table public.savings_funds  replica identity full;
