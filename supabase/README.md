# Nido · Base de datos (Supabase)

Las migraciones de `supabase/migrations/` están **escritas pero no aplicadas**.
La app funciona completa en **modo demostración** (navegador) sin tocar
Supabase. Aplicarlas es el paso para conectar el proyecto real, después del
testeo.

## Qué hay

| # | Archivo | Contenido |
| --- | --- | --- |
| 1 | `..._extensions.sql` | `pgcrypto` (`gen_random_uuid()`). |
| 2 | `..._tables_core.sql` | `profiles`, `households`. |
| 3 | `..._members.sql` | `members` (máximo 3, colores, rol, posición). |
| 4 | `..._tables_data.sql` | `income_entries`, `expenses`, `activity`, `app_settings`. |
| 5 | `..._helpers.sql` | `is_member_of`, `is_admin_of`, `gen_household_code`. |
| 6 | `..._triggers_members.sql` | Máximo 3 + color no repetido; perfil al crear usuario. |
| 7 | `..._triggers_activity.sql` | Actividad automática de gastos. |
| 8 | `..._triggers_income_members.sql` | Actividad de sueldos e integrantes. |
| 9 | `..._rls.sql` | RLS de perfiles, hogares e integrantes. |
| 10 | `..._rls_data.sql` | RLS de sueldos, gastos, actividad y ajustes. |
| 11 | `..._rpc_households.sql` | `create_household`, `preview_household`, `join_household`. |
| 12 | `..._rpc_misc.sql` | `regenerate_code`, `copy_month`, `delete_my_account`. |
| 13 | `..._realtime.sql` | Publicación Realtime de las tablas. |

## Cómo aplicarlas (etapa posterior)

```bash
npm install -g supabase          # si no lo tienes
supabase login
supabase link --project-ref TU_REF
supabase db push                 # aplica todas las migraciones en orden
```

O pega el contenido de cada archivo, en orden, en **Supabase → SQL Editor**.

Luego copia `.env.example` a `.env` y llena `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY` (solo la clave **anon**). Al reiniciar, la app deja el
modo demostración y usa el proyecto real.

## Seguridad

- RLS activa en todas las tablas: cada quien ve y toca solo su hogar.
- Sueldos: los ve el hogar; los edita su dueño (o quien administra).
- Gastos: los edita cualquier integrante del hogar.
- Las funciones que necesitan escribir fuera de RLS corren como
  `security definer` (crear/unirse a hogar, copiar mes, borrar cuenta).
- Realtime solo publica las tablas del hogar.

## Validación

El CLI de Supabase no puede validar estas migraciones localmente sin un
proyecto con Docker. Se revisaron **a mano**; si algo falla al aplicarlas, el
error de Postgres indicará la línea exacta.
