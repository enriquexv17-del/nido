# Probar que Nido se sincroniza

Objetivo: un cambio hecho en un dispositivo aparece en los otros **en pocos
segundos**, sin recargar.

Antes de empezar:

1. Aplica la **migración 18** en Supabase (ver `PENDIENTES_MARIO.md`, paso 1).
2. Ten a mano **dos dispositivos** (por ejemplo PC + Android) y, si quieres, un
   tercero (iPhone con la PWA). Todos entran con cuentas del **mismo hogar**.

## Lista manual

Marca el tiempo que tarda en verse en los otros dos:

| # | Acción en un dispositivo | ¿Se ve en los otros? | Segundos |
| --- | --- | --- | --- |
| 1 | **Agregar un gasto** (Gastos → Nuevo gasto) | ☐ | ____ |
| 2 | **Editar un sueldo** (Ingresos → Editar sueldo) | ☐ | ____ |
| 3 | **Quitar un gasto** (deslizar la fila → Eliminar) | ☐ | ____ |
| 4 | **Agregar un integrante** (Más → Integrantes) | ☐ | ____ |
| 5 | **Otro ingreso** (Más → Otros ingresos) | ☐ | ____ |
| 6 | **Una meta de ahorro** (Más → Ahorros) | ☐ | ____ |

Notas rápidas:

- Se espera **menos de 10 segundos** en todos. Si alguno tarda más o no se ve:
  1. comprueba que la migración 18 esté aplicada;
  2. vuelve a la app (al volver a primer plano, ella misma refresca);
  3. si sigue igual, cierra y abre la app.

## Prueba automática (opcional, para quien programa)

`tests/sincronizacion.spec.ts` hace lo mismo con dos usuarios distintos en dos
pestañas. **Se omite** salvo que existan credenciales de prueba en el entorno, y
**nunca** las imprime.

Requisitos:

- Un hogar de prueba con dos usuarios (`A` y `B`).
- Compilar la web **con** Supabase y servirla:
  ```powershell
  $env:VITE_SUPABASE_URL="https://TU_REF.supabase.co"
  $env:VITE_SUPABASE_ANON_KEY="la_clave_anon"
  npm run build
  ```
- Definir las variables (solo en tu sesión; no las escribas en archivos del
  repositorio):
  ```powershell
  $env:NIDO_E2E_SUPABASE="1"
  $env:NIDO_E2E_EMAIL_A="usuario-a@correo.com"
  $env:NIDO_E2E_PASSWORD_A="contraseña-de-A"
  $env:NIDO_E2E_EMAIL_B="usuario-b@correo.com"
  $env:NIDO_E2E_PASSWORD_B="contraseña-de-B"
  ```
- Ejecutar:
  ```powershell
  npx playwright test tests/sincronizacion.spec.ts
  ```

La prueba agrega un gasto llamado `Prueba <marca de tiempo>`; bórralo después
desde la app para no dejarlo en el hogar de prueba.

## Cómo funciona por dentro

- **Supabase Realtime**: la app escucha los cambios de las tablas en
  `src/data/provider.tsx` (`useRealtime`) e invalida la caché de TanStack Query.
- **Refuerzo**: además refresca al **volver a primer plano**, al **recuperar la
  conexión** y **cada minuto**, por si Realtime se cae o el móvil estuvo
  suspendido.
- Requisitos en la base: las tablas deben estar en la publicación
  `supabase_realtime` y con `replica identity full` (migración 18) para que los
  **borrados** también se difundan.
