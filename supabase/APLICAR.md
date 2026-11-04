# Aplicar Nido en Supabase (Fase 5A)

Guía para conectar la app real. **No necesitas pegar contraseñas ni la
`service_role` en ningún archivo del proyecto.**

## 1. Crear el proyecto

1. Entra a <https://supabase.com/dashboard> y crea un proyecto nuevo.
2. Espera a que termine de aprovisionarse (2–3 minutos).
3. Anota la **Project URL** y la clave **anon public** de
   *Project Settings → API*. La `service_role` **no se usa en el cliente**.

## 2. Ejecutar las migraciones

### Opción recomendada: todo de una vez (proyecto nuevo)

1. Abre **SQL Editor → New query**.
2. Abre el archivo [`all_migrations.sql`](./all_migrations.sql) de este repo.
3. Copia **todo** su contenido, pégalo en el editor y pulsa **Run**.
4. Debe terminar sin errores. El script crea las 17 migraciones en orden:
   tablas, funciones, disparadores, RLS, Realtime, los datos de ley y el
   endurecimiento de seguridad.

> ⚠️ Ejecútalo **una sola vez** en un proyecto vacío. Si lo vuelves a correr,
> fallará en `create table` porque las tablas ya existen (no borra nada).

### Opción CLI (proyecto nuevo o existente)

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_REF
supabase db push
```

`db push` aplica solo las migraciones que falten en `supabase/migrations/`.

### Si ya habías aplicado las migraciones 14 o 15 antes de esta fase

Esas versiones creaban las tablas pero **no activaban RLS**. Ejecuta una vez:

```sql
alter table public.other_incomes enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_funds enable row level security;
alter table public.deductions  enable row level security;
```

### Si ya tienes aplicadas las migraciones 1–16 (endurecimiento)

No vuelvas a correr `all_migrations.sql`. Ejecuta **solo** el archivo
[`migrations/20260101000017_hardening.sql`](./migrations/20260101000017_hardening.sql)
en el SQL Editor. Cierra la edición de los ajustes globales, limita quién puede
cambiar el rol o el `user_id` de un integrante, deja la actividad solo en manos
de los disparadores, alarga los códigos de hogar a 8 caracteres y recorta los
permisos de las funciones. No borra ni reescribe datos. Detalles en
[`RLS.md`](./RLS.md).

## 3. Configurar autenticación

En **Authentication → Providers**:

- **Email**: activado (registro con correo y contraseña).
- **Google** (opcional): actívalo si quieres el botón «Continuar con Google» y
  configura las credenciales de Google Cloud.
- **Confirm email**: puedes dejarlo activado (recomendado en producción). Tras
  el registro la app pide el **código de 6 dígitos** del correo y lo valida con
  `verifyOtp`, con opción de reenviarlo. Para que el correo incluya el código,
  la plantilla **Confirm signup** debe contener `{{ .Token }}` (Authentication →
  Email Templates). Para probar sin correo, desactívalo temporalmente.

En **Authentication → URL Configuration**:

- **Site URL**: tu URL pública, por ejemplo
  `https://TU_USUARIO.github.io/TU_REPO/`.
- **Redirect URLs**, agrega:
  - `https://TU_USUARIO.github.io/TU_REPO/**`
  - `http://localhost:5173/**`
  - `http://localhost:4173/**`

La recuperación de contraseña vuelve a
`.../?recuperar=1#/restablecer`; esa URL debe estar permitida.

## 4. Copiar las claves al proyecto

En la raíz del repo:

```bash
cp .env.example .env
```

Edita `.env` y llena **solo**:

```env
VITE_SUPABASE_URL=https://TU_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (anon public)
```

- `.env` está en `.gitignore`; **nunca** lo subas.
- Sin esas variables la app arranca en **modo demostración**.
- Con ellas arranca en **modo real** contra tu proyecto.

Reinicia `npm run dev` después de cambiar `.env`.

## 5. Verificar que RLS está activo

Ejecuta en el SQL Editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Todas las tablas de datos de usuario deben salir con `rowsecurity = true`:

`activity`, `app_settings`, `deductions`, `expenses`, `households`,
`income_entries`, `members`, `other_incomes`, `profiles`, `savings_funds`,
`savings_goals`.

Prueba rápida de aislamiento (dos cuentas de hogares distintos):

1. Crea la cuenta A, crea su hogar y anota el código.
2. Crea la cuenta B en una ventana privada, crea **otro** hogar.
3. Con B, intenta abrir el código de A desde «Unirme»: debe entrar al hogar de
   A solo si usas el código; no debe ver los gastos, sueldos, descuentos ni
   actividad de A.
4. En «Otros ingresos» y «Ahorros y metas», B no debe ver nada de A (son
   personales).
5. En el SQL Editor, con el rol `authenticated` simulado o desde la consola del
   navegador, un `select` a `other_incomes` de B no debe devolver filas de A.

El script `scripts/rls-check.mjs` automatiza esta prueba si le pasas las
credenciales de dos cuentas de prueba por variables de entorno (ver
`supabase/RLS.md`). **Nunca** pongas esas credenciales en el repo.

## 6. Cargar datos de ejemplo (opcional)

El hogar real arranca **vacío**. En Inicio aparece el botón
«Cargar datos de ejemplo» mientras no haya gastos: crea un sueldo, gastos,
un ingreso extra y una meta para que puedas probar la app. Se puede usar una
sola vez y no afecta a otros hogares.

## 7. Eliminar cuenta

La migración `20260101000012_rpc_misc.sql` incluye `delete_my_account()`, una
función `security definer` que borra los hogares creados, desvincula al usuario
de los hogares ajenos, borra su perfil y su usuario de `auth.users`. **No
necesita service role** y ya funciona con la clave anon.

Si tu proyecto prefiere no permitir `delete from auth.users` desde SQL, hay una
Edge Function alternativa escrita (sin desplegar) en
`supabase/functions/delete-account/`. Para usarla:

```bash
supabase functions deploy delete-account
```

y cambia el cliente para invocarla (instrucciones en
`supabase/functions/delete-account/README.md`). La función obtiene la
`service_role` del entorno de Supabase; nunca se escribe en el repo.

## 8. Publicar en GitHub Pages

Sigue [`PUBLICAR.md`](../PUBLICAR.md). En resumen: sube el repo a GitHub,
configura los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, activa
Pages con origen **GitHub Actions** y haz push a `main`. El workflow compila con
`VITE_BASE=/TU_REPO/` y despliega.

## Comprobación final

- [ ] Las 11 tablas públicas tienen `rowsecurity = true`.
- [ ] Registro, inicio de sesión y «Olvidé mi contraseña» funcionan.
- [ ] Crear hogar deja el hogar vacío y permite cargar el ejemplo.
- [ ] Dos cuentas de hogares distintos no se ven entre sí.
- [ ] Otros ingresos y ahorros solo los ve su dueño.
- [ ] Eliminar cuenta cierra la sesión y borra los datos.
- [ ] La PWA se instala y abre sin conexión.
- [ ] La pantalla Actualizaciones detecta una versión nueva y recarga.