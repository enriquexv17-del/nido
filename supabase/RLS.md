# Auditoría RLS de Nido

Revisión estática de las 16 migraciones (`supabase/migrations/`) y prueba
reproducible con dos cuentas reales. **Objetivo:** que una cuenta nunca vea ni
toque datos de otra, y que los ingresos extra y los ahorros sean privados de su
dueño incluso dentro del mismo hogar.

## Resultado

Las **11 tablas** con datos de usuario tienen `enable row level security` y
políticas explícitas. No queda ninguna tabla pública sin RLS.

| Tabla | RLS | Políticas | Veredicto |
| --- | --- | --- | --- |
| `profiles` | ✅ | select/insert/update solo `auth.uid() = id` | Correcto |
| `households` | ✅ | select si es miembro; insert como creador; update miembro; delete creador | Correcto |
| `members` | ✅ | select/insert/update miembro; delete solo admin | Correcto |
| `income_entries` | ✅ | select miembro; insert/update admin o dueño del sueldo | Correcto |
| `expenses` | ✅ | select/insert/update/delete miembro | Correcto |
| `activity` | ✅ | select miembro; insert miembro (los disparadores escriben como `security definer`) | Correcto |
| `app_settings` | ✅ | select autenticado; update admin | Correcto |
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

`scripts/rls-check.mjs` entra con dos cuentas, lee las tablas y comprueba que:

- A y B están en hogares distintos.
- B no ve hogares, integrantes, sueldos, gastos, actividad, descuentos ni
  ahorros del hogar de A.
- En `other_incomes`, `savings_goals` y `savings_funds`, cada cuenta solo ve
  filas de sus propios integrantes.

Solo hace lecturas: no crea, edita ni borra nada. Las credenciales van por
variables de entorno, **nunca** en el repositorio.

### Preparar las cuentas

1. Crea la cuenta A, crea su hogar y anota el código.
2. En una ventana privada, crea la cuenta B y crea **otro** hogar.
3. Confirma que A y B no comparten hogar (si compartieran, el script lo avisa).

### Ejecutar (PowerShell)

```powershell
$env:SUPABASE_URL="https://TU_REF.supabase.co"
$env:SUPABASE_ANON_KEY="eyJ... (anon public)"
$env:RLS_EMAIL_A="cuenta-a@correo.com"
$env:RLS_PASSWORD_A="..."
$env:RLS_EMAIL_B="cuenta-b@correo.com"
$env:RLS_PASSWORD_B="..."
npm run rls:check
```

Salida esperada: todas las líneas `PASS` y
`Aislamiento RLS correcto entre las dos cuentas.` Si algo falla, el script sale
con código 1 y nombra la tabla afectada.

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

## Lo que no cubre esta auditoría

- No se ejecutó contra un proyecto real: no había credenciales en el entorno.
  El script y los pasos quedan listos para que los corras con tu proyecto.
- El acceso directo a `auth.users` y a los esquemas internos de Supabase lo
  gestiona Supabase; aquí solo se auditan las tablas públicas de la app.