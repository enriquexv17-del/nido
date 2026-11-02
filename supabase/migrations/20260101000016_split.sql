-- Nido · 0016 · Fase 4: configuración de reparto del hogar
--
-- Guarda cómo se reparten los gastos: proporcional al sueldo neto, partes
-- iguales, porcentajes manuales o monto fijo por integrante. La apariencia
-- (modo claro/oscuro y acento) es una preferencia del dispositivo y vive en
-- `localStorage`, así que no necesita tabla.
--
-- (Migración escrita; no aplicada todavía.)

alter table public.households
  add column split_mode text not null default 'salary'
    check (split_mode in ('salary', 'equal', 'manual', 'fixed')),
  add column split_manual jsonb not null default '{}'::jsonb,  -- { memberId: pct }
  add column split_fixed jsonb not null default '{}'::jsonb;   -- { memberId: monto }