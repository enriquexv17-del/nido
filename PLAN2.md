# Nido · Plan de la Fase 2 (final)

Esta fase convierte la Fase 1 (UI + navegación + PWA con datos de prueba) en una
app **real, terminada y descargable**, con **animaciones cinematográficas** que
nunca traban. **No se cambia el diseño visual aprobado** (colores, textos,
radios, tipografía ni estructura de pantallas): solo se agrega vida (animación)
y datos reales.

## Decisiones de producto (fijas)

| Tema | Decisión |
| --- | --- |
| Nombre | Nido |
| Base del reparto | Sueldo **neto**, con opción «Partes iguales» |
| Quién edita | Cada quien edita **su propio sueldo**; **todos** editan los gastos; solo quien administra quita integrantes y borra el hogar |
| Gastos compartidos | Cada gasto se reparte entre **las personas elegidas** (chips «Se reparte entre») |
| Marcar pagado | No en esta versión |
| Moneda | USD |

## Stack

- **Supabase**: Auth (correo/contraseña + Google), Postgres con RLS y Realtime.
  Cliente `@supabase/supabase-js`.
- **TanStack Query** para caché, reintentos y suscripciones Realtime que
  invalidan la caché. Sin Redux.
- **motion** (sucesora de Framer Motion) + `LazyMotion`/`domAnimation` para las
  animaciones; CSS puro para lo simple.
- **Vitest** para el cálculo; **Playwright** para flujos, capturas y `perf`.
- **Capacitor** (Android), **Tauri** (Windows), **PWA** (iPhone).
- **GitHub Actions** para publicar web y Releases.

## Arquitectura de datos

```
src/data/
  supabase.ts     cliente de Supabase (o null si no hay variables de entorno)
  mock.dev.ts     datos simulados de la Fase 1 (modo ?dev=1 y pruebas)
  api.ts          lectura/escritura con dos modos (real o de prueba)
  types.ts        tipos del dominio (crudos y derivados) y constantes
  selectors.ts    derive(): aplica el cálculo real a los datos crudos
  queries.ts      hooks useHousehold/usePeople/useExpenses... (mismos nombres)
  mutations.ts    acciones (gastos, sueldos, integrantes, copiar mes)
  auth.tsx        sesión (correo/contraseña + Google) con Supabase
  provider.tsx    NidoProvider (TanStack Query + auth + mes) y Realtime
  index.ts        API pública de la capa de datos
src/lib/calc/     cálculo puro (AFP, ISSS, Renta, reparto, centavos)
supabase/migrations/  SQL con tablas, RLS, RPC y triggers
```

**Modo doble:** si faltan `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, la app
usa `mock.dev.ts` y funciona igual (para desarrollo y pruebas). Con variables de
entorno, usa Supabase de verdad. Los componentes no cambian.

## Cálculo real (fuente oficial)

- **AFP:** 7.25 % del sueldo bruto.
- **ISSS:** 3 % del bruto, base máxima $1,000 → **tope $30/mes**.
- **Renta (ISR) mensual:** apagada por defecto. Se calcula sobre
  `bruto − AFP − ISSS` con la tabla **del Decreto Ejecutivo No. 10 de 2025**
  (publicado en el Diario Oficial el **30 de abril de 2025**, vigente 8 días
  después; confirmado para 2026):

  | Tramo | Base gravada mensual | % | Sobre exceso de | Cuota fija |
  | --- | --- | --- | --- | --- |
  | I | $0.01 – $550.00 | 0 % | — | — |
  | II | $550.01 – $895.24 | 10 % | $550.00 | $17.67 |
  | III | $895.25 – $2,038.10 | 20 % | $895.24 | $60.00 |
  | IV | ≥ $2,038.11 | 30 % | $2,038.10 | $288.57 |

  Fuente: Ministerio de Hacienda, Decreto Ejecutivo No. 10 de 2025 (tablas de
  retención del ISR). Valores guardados en `app_settings` como datos editables;
  la nota «Valores de referencia 2026» se mantiene.
- **Reparto:** porcentaje = neto de cada persona ÷ suma de netos (solo de quienes
  participan en el gasto). Todo se calcula en **centavos enteros** y los restos
  se reparten con el **método del mayor resto** para que la suma dé el total exacto.
- **Partes iguales:** total ÷ personas, mismo ajuste de centavos.
- **Gasto por día:** monto × días (30 por defecto) y luego se reparte.
- **«Te queda»** = neto − tu parte.

Prueba de oro (Fase 1): netos $359.00 / $493.62 / $450.00, gastos $531.50 →
$146.48 / $201.41 / $183.61. Parte de Enrique: Renta $77.16 · Luz $8.96 ·
Agua $3.86 · Internet $6.89 · Comida $49.61 (suma $146.48).

**Doble restricción (A2):** el reparto cumple a la vez que cada gasto suma
exactamente su monto y que el total de cada persona es el del mayor resto sobre
el total general. Se resuelve como problema de transporte (redondeo
controlado + flujo máximo) en `src/lib/calc/balance.ts`; si la participación lo
hace imposible (nadie puede pagar un gasto) cae al modelo por gasto. Con los
datos de prueba los totales son exactos (146.48 / 201.41 / 183.61) y el detalle
por gasto de Enrique varía ≤2 ¢: Renta 77.18 · Luz 8.97 · Agua 3.85 ·
Internet 6.88 · Comida 49.60 (suma 146.48).

## Lenguaje de movimiento (`src/motion/tokens.ts`)

- Curva «cine»: `cubic-bezier(.22, 1, .36, 1)`.
- Resorte de interfaz: rigidez ≈ 320, amortiguación ≈ 30.
- Resorte pesado (hojas/tarjetas): rigidez ≈ 220, amortiguación ≈ 28.
- Duraciones: micro 120–180 ms · normal 260–360 ms · escena 500–700 ms.
- Escalonado de listas: 40–60 ms.
- Solo se anima `transform` y `opacity` (y `filter` en elementos pequeños).
  `prefers-reduced-motion` reemplaza todo por fundidos de 120 ms.

## Pasos de trabajo (y commits)

| Paso | Descripción | Estado |
| --- | --- | --- |
| — | Fase 1 (UI, navegación, PWA con datos de prueba) | ✔ |
| — | Plan de la Fase 2 (`PLAN2.md`) | ✔ |
| — | Dependencias + sistema de movimiento (`src/motion`) | ✔ |
| — | Cálculo puro + pruebas (Vitest) | ✔ |
| — | Capa de datos escrita (`src/data/*`, aún sin conectar) | ✔ |
| A1 | Conectar la capa de datos (`index.ts`, `session.tsx`, imports, borra `mock.ts`) | ✔ |
| A2 | Reparto con doble restricción (146.48 / 201.41 / 183.61) | ✔ |
| B | Cableado raíz (`NidoProvider` + `MotionRoot` + `RealtimeBridge`, `motion.css`, `AnimatePresence`) | pendiente |
| C | Supabase: migraciones SQL, RLS, RPC, triggers, `.env.example` | pendiente |
| D | Entrada funcional + rutas protegidas + cerrar sesión / eliminar cuenta | pendiente |
| E | Animaciones escenas 1–4 (bienvenida, transiciones, pasos, inicio) | pendiente |
| F | Animaciones escenas 5–8 (ingresos, gastos, sheets, reparto) | pendiente |
| G | Animaciones escenas 9–11 + estados (skeletons, vacío, error, sin conexión) | pendiente |
| H | Meses navegables + «Copiar de octubre» + caché sin conexión | pendiente |
| I | Pantalla Actualizaciones funcional | pendiente |
| J | Empaquetado (Capacitor Android + Tauri Windows) | pendiente |
| K | GitHub Actions (Pages + Releases) | pendiente |
| L | Pruebas de flujos + `perf` + `lighthouse` + capturas | pendiente |
| M | README + entrega final | pendiente |

## Verificación

| Requisito | Estado | Nota |
| --- | --- | --- |
| `npm run build` limpio (`strict: true`) | ✔ | sin errores ni avisos |
| Prueba de oro del cálculo | ✔ | 146.48 / 201.41 / 183.61 exactos |
| Pruebas unitarias del cálculo (Vitest) | ✔ | 25 pruebas en verde |
| Sin errores/avisos de consola | ✔ | 14 rutas verificadas tras A1 |
| Capa de datos conectada (mismos hooks) | ✔ | A1 (build + consola OK) |
| Tiempo real entre dos sesiones | pendiente | requiere proyecto Supabase real |
| Animaciones ≥ 55 fps con CPU ×4 | pendiente | `npm run perf` |
| Diseño sin cambios vs. Fase 1 | pendiente | capturas en el paso L |
| APK firmado | pendiente | requiere Android SDK + keystore (tuyo) |
| Instalador de PC | pendiente | requiere Rust/WebView2 (tuyo) |
| PWA iPhone | pendiente | ya existe; se actualiza sola |
| URL pública | pendiente | requiere tu repo de GitHub |

## Desviaciones y supuestos (documentados)

1. **`referencia/` no existe** (ya anotado en `PLAN.md`); se usa el PDF
   `Nido_maqueta_visual.pdf` como fuente visual.
2. **Sin proyecto Supabase real** en el entorno: la app corre en **modo prueba**
   (datos simulados) y el código real queda listo. Los archivos `.env.example`,
   la migración SQL y los scripts permiten activarlo con tus claves.
3. **Sin Android SDK ni Rust** en este equipo: se entregan `capacitor.config.ts`,
   el directorio `android/` (generado) y `src-tauri/` con sus scripts; el
   compilado final (APK / `.msi`) lo firma y publica en tu máquina o en CI.
4. **RAE/acentos en mensajes de commit:** el CLI de Git en Windows los escribe
   sin acentos; el texto visible de la app sí los respeta.
5. **`NidoProvider` se añadió ya en A1** (no en B): `session.tsx` ahora lee las
   personas de la capa de datos y necesita ese contexto; sin él la app no
   arranca. En B se completa el cableado raíz (`MotionRoot`, `RealtimeBridge`,
   `motion.css`, transiciones con `AnimatePresence`).
