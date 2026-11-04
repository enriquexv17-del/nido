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

`tests/sincronizacion.spec.ts` hace lo mismo en dos pestañas con dos sesiones
del mismo hogar. Como el acceso es **solo con Google**, el script no puede
iniciar sesión: reutiliza dos sesiones ya guardadas con `storageState`. **Se
omite** si no existen y **nunca** imprime tokens.

Requisitos:

- Un hogar de prueba con dos usuarios (`A` y `B`).
- Compilar la web **con** Supabase y servirla:
  ```powershell
  $env:VITE_SUPABASE_URL="https://TU_REF.supabase.co"
  $env:VITE_SUPABASE_ANON_KEY="la_clave_anon"
  npm run build
  npm run preview -- --port 4173
  ```
- En otra terminal, captura cada sesión (se abre una ventana; entra con Google):
  ```powershell
  node scripts/e2e-login.mjs "C:\Users\mario\nido-secrets\sesion-a.json"
  node scripts/e2e-login.mjs "C:\Users\mario\nido-secrets\sesion-b.json"
  ```
- Define las rutas y ejecuta:
  ```powershell
  $env:NIDO_E2E_STORAGE_A="C:\Users\mario\nido-secrets\sesion-a.json"
  $env:NIDO_E2E_STORAGE_B="C:\Users\mario\nido-secrets\sesion-b.json"
  npx playwright test tests/sincronizacion.spec.ts
  ```

Guarda esos archivos **fuera del repositorio**: contienen la sesión (tokens).
La prueba agrega un gasto `Prueba <marca de tiempo>`; bórralo después.

## Cómo funciona por dentro

- **Supabase Realtime**: la app escucha los cambios de las tablas en
  `src/data/provider.tsx` (`useRealtime`) e invalida la caché de TanStack Query.
- **Refuerzo**: además refresca al **volver a primer plano**, al **recuperar la
  conexión** y **cada minuto**, por si Realtime se cae o el móvil estuvo
  suspendido.
- Requisitos en la base: las tablas deben estar en la publicación
  `supabase_realtime` y con `replica identity full` (migración 18) para que los
  **borrados** también se difundan.
