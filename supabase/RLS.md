# Auditoría RLS de Nido

Revisión de las 17 migraciones (`supabase/migrations/`) y prueba reproducible
con dos cuentas reales. **Objetivo:** que una cuenta nunca vea ni toque datos de
otra, y que los ingresos extra y los ahorros sean privados de su dueño incluso
dentro del mismo hogar.

La migración **17 (`20260101000017_hardening.sql`)** añade el endurecimiento:
cierra la edición de los ajustes globales, limita `members` (nadie se asciende),
quita la escritura manual de `activity`, alarga los códigos y recorta permisos
de funciones. Se puede ejecutar sola sobre una base con 1–16 aplicadas.

## Resultado

Las **11 tablas** con datos de usuario tienen `enable row level security` y
políticas explícitas. No queda ninguna tabla pública sin RLS.

| Tabla | RLS | Políticas | Veredicto |
| --- | --- | --- | --- |
| `profiles` | ✅ | select/insert/update solo `auth.uid() = id` | Correcto |
| `households` | ✅ | select si es miembro; insert como creador; update miembro; delete creador | Correcto |
| `members` | ✅ | select miembro; insert/update restringidos (migración 17); delete solo admin | **Endurecido** |
| `income_entries` | ✅ | select miembro; insert/update admin o dueño del sueldo | Correcto |
| `expenses` | ✅ | select/insert/update/delete miembro | Correcto |
| `activity` | ✅ | select miembro; sin política de insert: solo los disparadores escriben | **Endurecido** |
| `app_settings` | ✅ | select autenticado; sin update desde el cliente | **Endurecido** |
| `other_incomes` | ✅ | las 4 operaciones solo el dueño (`members.user_id = auth.uid()`) | **Privado** |
| `savings_goals` | ✅ | las 4 operaciones solo el dueño | **Privado** |
| `savings_funds` | ✅ | las 4 operaciones solo el dueño | **Privado** |
| `deductions` | ✅ | las 4 operaciones cualquier miembro del hogar | Correcto |

Las funciones `public.is_member_of()` y `public.is_admin_of()` son
`security definer` con `search_path = public`, así que las políticas pueden
consultar `members` sin recursión y sin filtrarse por RLS.

## Hallazgos

1. **Corregido en el Paso 1 (`e02de64`).** Las migraciones 14 y 15 creaban
   políticas pero **no activaban** RLS en `other_incomes`, `savings_goals`,
   `savings_funds` ni `deductions`. Sin `enable row level security`, las
   políticas no se aplican y con la clave anon se podrían leer filas ajenas.
   Ya está activado en la migración y en `all_migrations.sql`.
2. **Sin huecos de lectura entre cuentas.** Todas las tablas del hogar filtran
   por `is_member_of(household_id)`; las personales filtran por el `member_id`
   del usuario. Un integrante del hogar A no puede leer filas del hogar B.
3. **Endurecimiento opcional (no bloqueante).** En las tres tablas personales,
   el `with check` de `update` valida que el `member_id` siga siendo del dueño,
   pero no vuelve a comprobar `is_member_of(household_id)`. Un dueño podría
   cambiar el `household_id` de una fila suya a un hogar ajeno: la fila seguiría
   siendo invisible para ese hogar (el `select` va por `member_id`), así que no
   hay fuga, pero deja un dato incoherente. Si quieres cerrarlo, ejecuta una vez
   en el SQL Editor:

   ```sql
   drop policy other_incomes_update on public.other_incomes;
   create policy other_incomes_update on public.other_incomes
     for update using (
       exists (select 1 from public.members m
               where m.id = member_id and m.user_id = auth.uid())
     ) with check (
       public.is_member_of(household_id)
       and exists (select 1 from public.members m
                   where m.id = member_id and m.user_id = auth.uid())
     );
   -- Repite el mismo patrón para savings_goals_update y savings_funds_update.
   ```

4. **`service_role` fuera del cliente.** La app solo usa la clave anon. Si la
   `service_role` se filtra, RLS deja de proteger: nunca debe ir en `.env`, en
   GitHub Secrets del build ni en el navegador.

## Endurecimiento (migración 17)

Cada punto se revisó contra las migraciones 1–16 antes de cambiarlo.

1. **`app_settings` sin escritura.** La política `settings_update` dejaba que
   cualquier admin de cualquier hogar editara la fila global (`id = 1`). La app
   **no lee ni escribe** esa tabla (los valores de ley viven en
   `src/lib/calc/settings.ts` y, por hogar, en `public.deductions`), así que se
   elimina la política y se conserva la lectura (`settings_select`).
2. **`members` restringido.** Antes cualquier miembro podía insertar/editar
   cualquier ficha, incluido su propio `role` o `user_id`. Ahora:
   - **Insertar:** un admin del hogar, o cualquier miembro creando una ficha
     sin cuenta (`role = 'member'` y `user_id is null`).
   - **Editar:** un admin edita cualquier ficha; un miembro **solo la suya**.
   - **Disparador `members_guard_privileges`** (BEFORE INSERT/UPDATE): un
     miembro no puede cambiar `role`, `user_id` ni `household_id`; si lo
     intenta, la operación falla. Es `security invoker` a propósito para que
     `current_user` distinga al cliente (`authenticated`) de las funciones
     `security definer` internas (`create_household`, `join_household`,
     `delete_my_account`), que siguen funcionando igual.
3. **Permisos de funciones.** Se revoca `EXECUTE` de `public`/`anon`
   (y de `authenticated` en las de uso interno) y se conserva para
   `authenticated` en las RPC que la app llama:

   | Función | anon | authenticated |
   | --- | --- | --- |
   | `log_activity`, `current_member` | ❌ | ❌ (solo disparadores) |
   | `preview_household` | ❌ | ✅ |
   | `join_household`, `create_household` | ❌ | ✅ |
   | `regenerate_code`, `copy_month`, `delete_my_account` | ❌ | ✅ |
   | `is_member_of`, `is_admin_of` | (sin cambios) | ✅ (las usan las políticas) |

   Los disparadores de actividad siguen funcionando: `expenses_activity`,
   `income_activity` y `members_activity` son `security definer` y llaman a
   `log_activity`/`current_member` **como su dueño**, no como el cliente.
4. **Códigos de hogar de 8 caracteres.** `gen_household_code()` genera
   `NIDO-XXXXXXXX` (mismo alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`). Los
   códigos existentes siguen válidos (nada compara por longitud). La UI pide 4+
   caracteres y **no** limita el máximo, así que acepta el nuevo largo.
5. **`activity` solo la escriben los disparadores.** Se quita `activity_insert`.
   `log_activity` es `security definer` (dueño de la tabla) → RLS no lo frena y
   la actividad se sigue registrando sola.
6. **`delete_my_account` con cascada.** Al borrar un dueño se borra su hogar y,
   en cascada, gastos e integrantes. Los disparadores de actividad intentaban
   insertar en `activity` con un `household_id` ya inexistente → violación de
   clave foránea. `log_activity` ahora comprueba que el hogar exista y omite el
   registro si no, de modo que el borrado termina bien.

## Comprobar el estado en Supabase

En **SQL Editor**, ejecuta:

```sql
-- 1) ¿Todas las tablas tienen RLS?
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- 2) Políticas efectivas
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

En la primera consulta, las 11 tablas deben salir con `rowsecurity = true`.

## Prueba automática con dos cuentas

`scripts/rls-check.mjs` entra con cuentas reales y comprueba:

- **Aislamiento:** A y B están en hogares distintos; B no ve hogares,
  integrantes, sueldos, gastos, actividad, descuentos ni ahorros del hogar de A;
  en `other_incomes`, `savings_goals` y `savings_funds` cada cuenta solo ve lo
  suyo.
- **Endurecimiento (migración 17):**
  - una cuenta anónima **no** puede llamar a `preview_household`,
    `join_household`, `create_household`, `regenerate_code`, `copy_month`,
    `delete_my_account`, `log_activity` ni `current_member` (error
    `permission denied`);
  - `app_settings` no se puede editar desde el cliente;
  - un integrante con rol `member` no puede ascenderse a `admin` ni cambiar su
    `user_id`, y no puede editar fichas ajenas;
  - `delete_my_account` borra una cuenta con hogar y gastos (solo si defines la
    cuenta desechable, ver abajo).

Las credenciales van por variables de entorno, **nunca** en el repositorio. Las
comprobaciones de ascenso de rol y de edición ajena **deben fallar**: si
"pasan" es que el endurecimiento no está aplicado.

### Preparar las cuentas

1. Crea la cuenta A, crea su hogar y anota el código.
2. En una ventana privada, crea la cuenta B y crea **otro** hogar.
3. Confirma que A y B no comparten hogar (si compartieran, el script lo avisa).
4. *(Opcional, para probar el ascenso de rol)* con otra cuenta M, entra a
   «Unirme» con el código del hogar de A: M queda como `member`.
5. *(Opcional, destructivo)* crea una cuenta **desechable** para probar el
   borrado. El script la elimina de verdad.

### Ejecutar (PowerShell)

```powershell
$env:SUPABASE_URL="https://TU_REF.supabase.co"
$env:SUPABASE_ANON_KEY="eyJ... (anon public)"
$env:RLS_EMAIL_A="cuenta-a@correo.com"
$env:RLS_PASSWORD_A="..."
$env:RLS_EMAIL_B="cuenta-b@correo.com"
$env:RLS_PASSWORD_B="..."
# Opcionales:
$env:RLS_EMAIL_M="miembro-del-hogar-a@correo.com"
$env:RLS_PASSWORD_M="..."
$env:RLS_DELETE_EMAIL="cuenta-desechable@correo.com"
$env:RLS_DELETE_PASSWORD="..."
npm run rls:check
```

Salida esperada: todas las líneas `PASS` y
`Aislamiento RLS y endurecimiento correctos.` Si algo falla, el script sale con
código 1 y nombra la comprobación afectada. Las líneas `INFO` indican pruebas
omitidas por falta de la cuenta opcional.

### Prueba manual (sin script)

1. Con la cuenta B, intenta abrir el código del hogar A en «Unirme»: solo debe
   entrar si usa el código correcto. Si entra, debe ver el hogar A (es su
   decisión unirse) pero no los datos personales de A.
2. En «Otros ingresos» y «Ahorros y metas», B no debe ver nada de A.
3. En la consola del navegador con la sesión de B:
   ```js
   const { data } = await supabase.from("other_incomes").select("*");
   ```
   Solo deben aparecer filas de B.
4. Cierra sesión y entra con A: B no debe ver los gastos ni el código del
   hogar de A.
5. **Ajustes globales:** en la consola, intenta
   `await supabase.from("app_settings").update({ afp_rate: 0.5 }).eq("id", 1).select()`;
   debe devolver **0 filas** y el valor no debe cambiar.
6. **Ascenso de rol:** con una cuenta `member`, intenta
   `await supabase.from("members").update({ role: "admin" }).eq("id", MI_FICHA).select()`;
   debe dar error (`SIN_PERMISO…`) y el rol no cambia.
7. **Códigos largos:** en «Integrantes», pulsa regenerar y comprueba que el
   nuevo código tiene **8 caracteres** después de `NIDO-`; el anterior sigue
   sirviendo para unirse.

## Lo que no cubre esta auditoría

- No se ejecutó contra un proyecto real: no había credenciales en el entorno.
  El script y los pasos quedan listos para que los corras con tu proyecto.
- El acceso directo a `auth.users` y a los esquemas internos de Supabase lo
  gestiona Supabase; aquí solo se auditan las tablas públicas de la app.