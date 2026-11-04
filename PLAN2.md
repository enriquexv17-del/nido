# Nido · Plan de la Fase 2 (final) y Fase 3

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
- **Capacitor** (Android), **Electron** (Windows), **PWA** (iPhone).
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
  mutations.ts    acciones (gastos, sueldos, integrantes, copiar mes, ingresos extra, metas y fondos)
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
| B | Cableado raíz (`NidoProvider` + `MotionRoot` + `RealtimeBridge`, `motion.css`, `AnimatePresence`) | ✔ |
| C | Supabase: migraciones SQL, RLS, RPC, triggers, `.env.example` | ✔ |
| D | Entrada funcional + rutas protegidas + cerrar sesión / eliminar cuenta | ✔ |
| E | Animaciones escenas 1–4 (bienvenida, transiciones, pasos, inicio) | ✔ |
| F | Animaciones escenas 5-8 (ingresos, gastos, sheets, reparto) | ✔ |
| G | Animaciones escenas 9–11 + estados (skeletons, vacío, error, sin conexión) | ✔ |
| H | Meses navegables + «Copiar de octubre» + caché sin conexión | ✔ |
| I | Pantalla Actualizaciones funcional | ✔ |
| J | Empaquetado (Capacitor Android + Electron Windows) | pendiente |
| K | GitHub Actions (Pages + Releases) | pendiente |
| L | Pruebas de flujos + `perf` + `lighthouse` + capturas | ✔ |
| M | README + entrega final | pendiente |

## Verificación

| Requisito | Estado | Nota |
| --- | --- | --- |
| `npm run build` limpio (`strict: true`) | ✔ | sin errores ni avisos |
| Prueba de oro del cálculo | ✔ | 146.48 / 201.41 / 183.61 exactos |
| Pruebas unitarias del cálculo (Vitest) | ✔ | 37 pruebas en verde (12 nuevas de ahorro) |
| Sin errores/avisos de consola | ✔ | 16 rutas verificadas (incluye Fase 3) |
| Capa de datos conectada (mismos hooks) | ✔ | A1 (build + consola OK) |
| Tiempo real entre dos sesiones | ✔ | modo demo (BroadcastChannel) entre dos pestañas; Supabase real queda pendiente |
| Estados de carga, vacío, error y sin conexión | ✔ | esqueletos con shimmer; aviso «Sin conexión» probado sin red |
| Meses navegables y «Copiar de <mes anterior>» | ✔ | Sep/Oct/Nov fijos; cambiar de mes recalcula; copiar funciona |
| Sin conexión: reabre con los últimos datos | ✔ | service worker + almacén local; editar sin conexión también |
| Actualizaciones compara versiones reales | ✔ | instalada (`package.json`) vs. publicada (`version.json`); descarga e instala |
| Flujo completo de gastos (crear/recargar/editar/eliminar) | ✔ | totales 531.50 → 581.50 → 591.50 → 531.50 |
| Accesibilidad básica en todas las rutas | ✔ | `h1` único, botones con nombre, campos con etiqueta, `lang=es` |
| Lighthouse móvil | ✔ | rendimiento 98 · accesibilidad 100 · buenas prácticas 100 |
| PWA instalable | ✔ | manifiesto (nombre, iconos 192/512, `standalone`) + `sw.js` servido |
| Animaciones ≥ 55 fps con CPU ×4 | ✔ | 60.2 fps y 0 tareas largas en la ventana de animación (`npm run perf`) |
| Diseño sin cambios vs. Fase 1 | ✔ | 16 rutas en `capturas-fase3/{movil,pc}` comparadas con la maqueta |
| APK firmado | pendiente | requiere Android SDK + keystore (tuyo) |
| Instalador de PC | pendiente | se compila con Electron (ver «Etapa Electron») |
| PWA iPhone | pendiente | ya existe; se actualiza sola |
| URL pública | pendiente | requiere tu repo de GitHub |

## Desviaciones y supuestos (documentados)

1. **`referencia/` no existe** (ya anotado en `PLAN.md`); se usa el PDF
   `Nido_maqueta_visual.pdf` como fuente visual.
2. **Sin proyecto Supabase real** en el entorno: la app corre en **modo prueba**
   (datos simulados) y el código real queda listo. Los archivos `.env.example`,
   la migración SQL y los scripts permiten activarlo con tus claves.
3. **Sin Android SDK** en este equipo: se entregan `capacitor.config.ts`, el
   directorio `android/` (generado) y sus scripts; el APK final lo firma y
   publica en tu máquina o en CI. Windows se empaqueta con Electron
   (`electron/` + `electron-builder.yml`, ver «Etapa Electron»).
4. **RAE/acentos en mensajes de commit:** el CLI de Git en Windows los escribe
   sin acentos; el texto visible de la app sí los respeta.
5. **`NidoProvider` se añadió ya en A1** (no en B): `session.tsx` ahora lee las
   personas de la capa de datos y necesita ese contexto; sin él la app no
   arranca. En B se completa el cableado raíz (`MotionRoot`, `RealtimeBridge`,
   `motion.css`, transiciones con `AnimatePresence`).
6. **Entrada sin `AnimatePresence`:** las pantallas de entrada (bienvenida,
   cuenta, hogar, invitar, unirme) se animan al entrar pero **no al salir**.
   Con `mode="wait"` el formulario se remontaba al terminar la animación y
   perdía lo escrito; con la clave por ruta se conserva el estado. Las
   pestañas de la app usan `AnimatePresence` en `mode="wait"` (fundido rápido
   y secuencial): el fundido cruzado (`popLayout`) dejaba dos pantallas en el
   DOM a la vez.
7. **Modo demostración real:** crear un hogar deja un hogar nuevo con una sola
   persona (nombre y color elegidos) y sin gastos; unirse agrega a la persona
   por nombre. Con `?dev=1` aparece «Restaurar ejemplo» para volver a los datos
   de la maqueta (146.48 / 201.41 / 183.61).
8. **Gastos y sueldos ya guardan** (modo demo): el botón «Guardar» de las hojas
   de gasto y de sueldo escribe en la capa de datos real (`useExpenseActions`,
   `useIncomeActions`) y la caché se refresca; editar un gasto se ve al instante
   en las otras pestañas. Se adelantó este cableado (previsto para el paso F)
   porque sin él no se podía probar el tiempo real.
9. **Sin elemento compartido entre Reparto y «Tu parte»:** las pestañas usan
   `AnimatePresence` en `mode="wait"`, así que no hay dos pantallas vivas a la
   vez para una transición `layoutId`. En su lugar, «Tu parte» recibe por
   `state` el modo elegido («Según sueldo» / «Partes iguales») y recalcula con
   el mismo motor, para que las cifras coincidan.
10. **`sharePct` ahora es el porcentaje real del gasto del hogar** (antes se
    calculaba sobre el neto). Con el reparto por sueldo los valores coinciden
    con la maqueta (27.6 % / 37.9 % / 34.5 %); en «Partes iguales» pasa
    correctamente a 33.3 %. El texto «del sueldo del hogar» de «Tu parte» se
    conserva por la regla de oro (no se cambia el diseño de la Fase 1).
11. **Meses anclados al mes por defecto:** la fila de meses (Sep/Oct/Nov, del más
    viejo al más nuevo) se calcula a partir del mes por defecto y **no** del mes
    seleccionado, para que elegir un mes no reordene la fila. «Copiar de …» copia
    siempre del mes anterior al activo.
12. **Sin conexión en modo demo:** los cambios se guardan en `localStorage` de
    forma síncrona, así que quedan disponibles al reabrir sin red y no hay nada
    «pendiente» que reintentar; el aviso «Sin conexión» solo informa. El modo
    Supabase necesitará una cola de escrituras y persistencia de la caché de
    React Query, que se añadirá al conectar tus claves (no se inventa aquí).
13. **Actualizaciones con datos reales:** la versión instalada sale de
    `package.json` y la publicada de `public/version.json`; la pantalla las
    compara. La barra de descarga es simulada (todavía no hay APK que bajar) y
    «Instalar y reiniciar» aplica la PWA (service worker + recarga). La barra
    lateral y la fila de «Más» muestran la versión real.

## Fase 3 · Ingresos extra y ahorros (final)

Dos secciones **personales** dentro de «Más», sin tocar la barra inferior ni el
diseño de la Fase 1. No entran al reparto del hogar ni a la prueba de oro.

### Qué se agregó

| Sección | Ruta | Qué hace |
| --- | --- | --- |
| Otros ingresos | `/mas/otros-ingresos` | Registra ingresos de negocios o trabajos aparte (fuente, qué fue, monto y día opcional) con crear, editar y eliminar. |
| Ahorros y metas | `/mas/ahorros` | Muestra lo que sobra del mes (neto + otros ingresos − tu parte de gastos), lo reparte en fondos automáticos editables y lleva metas con progreso. |

- **Fondos automáticos:** cada fondo recibe un porcentaje de lo que sobra. Si los
  porcentajes suman más de 100, se escalan en proporción para no ahorrar de más.
  El pie muestra «Total ahorro» y «Queda libre».
- **Metas:** nombre, objetivo, ahorrado, frecuencia (diario, semanal o mensual) y
  mes límite opcional. Se calcula cuánto apartar por periodo y el progreso con
  una barra `transform: scaleX(...)`.
- **Sumar ahorro:** botón por meta para incrementar lo ahorrado sin editar todo.

### Datos y cálculo

- `src/data/types.ts`: `RawOtherIncome`, `RawGoal`, `RawFund` y `SavingsFrequency`;
  `Snapshot` incluye `otherIncomes`, `goals` y `funds`.
- `src/data/mock.dev.ts`: datos de ejemplo de noviembre (marca de ropa $60 y
  edición de video $45), dos metas y tres fondos. `normalize()` completa los
  arreglos nuevos para no perder datos guardados antes de la actualización.
- `src/lib/calc/savings.ts`: `availableToSave`, `distributeFunds` (método del
  mayor resto, suma exacta) y `goalProgress` (diario, semanal o mensual, con o sin
  fecha). 12 pruebas nuevas.
- La migración `supabase/migrations/20260101000014_savings.sql` deja escritas las
  tablas `other_incomes`, `savings_goals` y `savings_funds` con RLS personal.
  **No se aplicó.**

Con los datos de ejemplo, Enrique tiene neto $359.00 + otros ingresos $105.00 −
su parte $146.48 = **$317.52** disponibles; el reparto 40/20/40 da
$127.01 / $63.50 / $127.01. La prueba de oro del hogar sigue exacta:
359.00 / 493.62 / 450.00 y 146.48 / 201.41 / 183.61.

### Pasos de trabajo (y commits)

| Paso | Descripción | Estado |
| --- | --- | --- |
| 1 | Modelo de datos de ingresos extra, metas y fondos | ✔ |
| 2 | Cálculo del ahorro + pruebas | ✔ |
| 3 | Capa de datos (API, consultas, acciones) + migración SQL | ✔ |
| 4 | Pantalla de otros ingresos (CRUD personal) | ✔ |
| 5 | Pantalla de ahorros y metas (fondos, automático y objetivos) | ✔ |
| 6 | Flujos Playwright + rutas nuevas en consola y accesibilidad | ✔ |
| 7 | Documentación (`PLAN2.md`, `supabase/README.md`) | ✔ |

### Verificación de la Fase 3

| Requisito | Estado | Nota |
| --- | --- | --- |
| `npm run build` limpio (`strict: true`) | ✔ | sin errores ni avisos |
| Pruebas unitarias (Vitest) | ✔ | 37 en verde (12 nuevas de ahorro) |
| Playwright | ✔ | 38 pasan, 12 omitidos (una vez basta) |
| Cero errores/avisos de consola | ✔ | rutas nuevas incluidas |
| Accesibilidad básica | ✔ | `h1` único, botones con nombre, campos con etiqueta |
| Prueba de oro intacta | ✔ | netos y reparto exactos; gastos $531.50 |
| Ingresos extra personales | ✔ | fuera del reparto; crear, editar, eliminar y persistencia local |
| Ahorro automático | ✔ | fondos editables con monto calculado y aviso si suman > 100 % |
| Metas con progreso | ✔ | «Aparta» por periodo y barra con `transform` |
| Animación | ✔ | solo `transform`/`opacity`; reduced motion con fundidos de 120 ms |

## Fase 4 · Ajustes funcionales, reparto configurable y apariencia (final)

La app sigue funcionando en **modo demostración**, con los mismos datos de
ejemplo y la misma prueba de oro. Lo nuevo se puede configurar sin tocar código.

### Menú lateral de PC

- «Otros ingresos» (`/mas/otros-ingresos`) y «Ahorros y metas» (`/mas/ahorros`)
  pasan a ser elementos propios del menú lateral. En móvil siguen dentro de
  «Más» y la barra inferior conserva sus **5 pestañas**.
- Las rutas no cambian. Al estar en `/mas` no se resalta dos veces una sección.
- Iconos rediseñados: ahorros es una **alcancía** y otros ingresos son **monedas**.
- «Cerrar sesión» y «Eliminar cuenta» vuelven a ser botones de ancho completo con
  borde correcto (el reset de estilos de `button` ya no los deja «pegados»).

### Descuentos editables (`/mas/descuentos`)

Los descuentos son **del hogar** y se guardan en `Snapshot.deductions`:

| Campo | Uso |
| --- | --- |
| `name`, `order` | Nombre visible y orden de cálculo. |
| `type` | `percent` (porcentaje), `fixed` (monto fijo) o `bracket` (tabla progresiva). |
| `value` | Tasa (0.0725) o monto en dólares según el tipo. |
| `maxBase`, `cap` | Base máxima y tope opcionales (ISSS: base $1,000 → tope $30). |
| `active`, `isLaw`, `key` | Interruptor, si es de ley y clave estable `afp`/`isss`/`isr`. |
| `brackets`, `verify` | Tramos de la tabla y marca «verificar». |

Valores de ley por defecto:

- **AFP:** 7.25 %, base máxima cotizable $7,045.06 (marcada «verificar»).
- **ISSS:** 3 % con base máxima $1,000 y tope de $30 al mes.
- **Renta (ISR):** hasta $550 exento; $550.01–$895.24 → 10 % del exceso sobre
  $550 + $17.67; $895.25–$2,038.10 → 20 % del exceso sobre $895.24 + $60.00;
  más de $2,038.10 → 30 % del exceso sobre $2,038.10 + $288.57.
- La base de Renta es **bruto − AFP − ISSS**.
- Nota visible: «Valores revisados en nov 2026; confirma con Hacienda o tu patrono».

La pantalla permite encender/apagar, editar, eliminar, **agregar descuento**,
editar los tramos de una tabla y **restablecer los valores de ley**. Los netos y
el reparto se recalculan en Inicio, Ingresos, Gastos, Reparto y Ahorros.

Los descuentos de ley respetan además el interruptor personal que ya existía
(`afpOn`/`isssOn`/`isrOn`), de modo que los datos de ejemplo conservan sus netos.
Los descuentos personalizados activos se aplican a todos los integrantes.

### Cómo se reparte (`/reparto`)

Se elige y **se guarda** en `Snapshot.split`:

| Modo | Cálculo |
| --- | --- |
| Según sueldo (por defecto) | Proporcional al sueldo **neto** (peso `netWeight`). |
| Partes iguales | Cada gasto se divide en partes iguales entre sus participantes. |
| % manual | Porcentajes por integrante; deben sumar 100 %. |
| Monto fijo | Monto mensual por integrante. |

Antes de guardar se muestra una **vista previa** con los datos actuales. La
pantalla de detalle usa el mismo modo persistido. En todos los casos cada gasto
suma exactamente su monto.

### Apariencia (`/mas/apariencia`)

- **Modo:** Claro, Oscuro o Automático (sigue al sistema en caliente).
- **Acento:** índigo (actual), verde, rosa, naranja, turquesa y morado. Se aplican
  con variables CSS sobre `--anil*`; en modo oscuro usan tonos claros y un
  `--anil-solid` más profundo para que el texto blanco de botones y píldoras
  mantenga contraste AA.
- Es una preferencia **del dispositivo**: `nido.theme.mode` y `nido.theme.accent`
  en `localStorage`, aplicadas como `data-theme`/`data-accent` en `<html>`.
- Un script en `index.html` aplica el tema antes de pintar (sin destello claro) y
  las metas `theme-color` acompañan al modo.

### Datos, cálculo y migraciones

- `src/data/types.ts`: `Snapshot.deductions` y `Snapshot.split`; `Person.deductions`
  y `deductionTotal` para el detalle por persona.
- `src/lib/calc/settings.ts`: modelo `Deduction`, `DEFAULT_DEDUCTIONS` y
  `lawDefaults()`. `calcDeductions` y `resetLawDeductions` en `src/lib/calc`.
- `src/lib/calc/index.ts`: `SplitMode` (`salary`/`equal`/`manual`/`fixed`),
  `calcShares(..., customWeights)` y `splitConfig`.
- `src/lib/calc/balance.ts`: `balanceToIdeal(..., idealOverride)` para los modos
  manual y fijo (misma doble restricción: filas y columnas exactas).
- Mock (`mock.dev.ts`), API, consultas, mutaciones y `selectors.ts` leen y
  guardan descuentos y reparto; `normalize()` completa datos guardados antes.
- Migraciones `20260101000015_deductions.sql` y `20260101000016_split.sql`
  **escritas y no aplicadas**.

### Pasos de trabajo (y commits)

| Paso | Descripción | Estado |
| --- | --- | --- |
| 1 | Menú lateral de PC, iconos y botones de cuenta | ✔ |
| 2 | Modelo y cálculo de descuentos editables + Vitest | ✔ |
| 3 | Capa de datos, pantalla de descuentos y migración SQL | ✔ |
| 4 | Cuatro modos de reparto con vista previa y persistencia | ✔ |
| 5 | Apariencia (modo y acento) con tokens de tema | ✔ |
| 6 | Pruebas Playwright, capturas y documentación | ✔ |

### Verificación de la Fase 4

| Requisito | Estado | Nota |
| --- | --- | --- |
| `npm run build` limpio (`strict: true`) | ✔ | sin errores ni avisos |
| Pruebas unitarias (Vitest) | ✔ | 48 en verde (25 de cálculo, 7 de descuentos, 4 de reparto, 12 de ahorro) |
| Playwright (móvil y PC) | ✔ | 48 pasan, 20 omitidos (una vez basta) |
| Cero errores/avisos de consola | ✔ | incluye `/mas/apariencia` |
| Accesibilidad básica | ✔ | `h1` único, botones con nombre, campos con etiqueta |
| Contraste AA en modo oscuro | ✔ | verificado en las 12 pantallas con los 6 acentos |
| Prueba de oro intacta | ✔ | netos 359.00 / 493.62 / 450.00; reparto 146.48 / 201.41 / 183.61; gastos $531.50 |
| Descuentos editables | ✔ | ISSS apagado: Enrique $371.00 y Joaquín $510.12; descuento fijo de $50: Enrique $321.00 |
| Reparto configurable | ✔ | proporcional, partes iguales, % manual 50/30/20 = 265.75 / 159.45 / 106.30 y monto fijo |
| Apariencia persistente | ✔ | recarga conserva modo y acento |
| Capturas | ✔ | `capturas-fase4/` (claro, oscuro y 6 acentos; no se versiona) |

## Fase 5B · Empaquetado para Android y Windows (en curso)

Esta etapa **no rediseña nada**: solo empaqueta la web ya terminada como app de
Android (Capacitor) y de Windows (Electron), y hace reales las actualizaciones.

### Paso 0 · Diagnóstico del entorno (esta máquina)

| Herramienta | Estado | Versión / nota |
| --- | --- | --- |
| Node.js | ✔ | v24.20.0 |
| npm | ✔ | 11.19.0 |
| Java (JDK) | ✔ | OpenJDK 21.0.12.1 LTS (`java` y `javac`) |
| Capacitor CLI | ✔ | 8.6.0 (`npx cap`) |
| Tauri CLI | ✔ | 2.12.4 (se usó en la primera pasada; **retirado** en la Etapa Electron) |
| WebView2 (runtime) | ✔ | 156.0.4314.58 |
| winget | ✔ | v1.29.380 (para instalar lo que falte) |
| Rust / `rustc` / `cargo` | ✘ | **no instalado** |
| MSVC C++ Build Tools | ✘ | **no instalado** (vswhere no encontrado) |
| Android SDK / `ANDROID_HOME` | ✘ | variable vacía |
| `adb` | ✘ | no instalado |
| `gradle` (global) | ✘ | no instalado (Capacitor usa su wrapper) |
| Git remoto | ✔ | `origin` = `enriquexv17-del/nido`; `main` local = remoto (`c471f2a`) |
| GitHub Pages | ✔ | en vivo: <https://enriquexv17-del.github.io/nido/> |
| Supabase real | ✔ | `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` en `.env` local y como secretos de Actions |

**Conclusión.** La web, Supabase y Pages ya están hechos y verificados. En esta
máquina **no** hay Android SDK, así que el APK **no se puede compilar aquí**: se
dejan los scripts y la configuración listos y el compilado final lo produce
GitHub Actions (Paso 5). El andamiaje de Android (`npx cap add android`) sí se
genera aquí. Windows se rehízo con **Electron** (no necesita Rust ni MSVC).

### Decisiones de empaquetado

| Tema | Decisión |
| --- | --- |
| Identificador de app | `com.nido.app` (Android y Electron) |
| Nombre | `Nido` |
| Base de Vite nativa | `VITE_BASE=./` (`build:android`/`build:desktop`); Pages sigue con `/nido/` |
| Service worker | **no** se registra dentro de Capacitor/Electron (ya viene empaquetada) |
| Actualizaciones | una utilidad `src/lib/updater.ts` con interfaz común por plataforma |
| Firma Android | keystore **fuera del repo**; sin él, APK de depuración |
| Firma Windows | sin firma de código: SmartScreen avisará (se documenta) |

### Pasos de trabajo (y commits)

| Paso | Descripción | Estado |
| --- | --- | --- |
| 0 | Diagnóstico del entorno (este apartado) | ✔ `71fa3a2` |
| 1 | Web lista para nativo (`platform.ts`, build relativo, sin SW en nativo, Google Android) | ✔ `a81d5d8` |
| 2 | Android con Capacitor (config, proyecto, íconos, firma, scripts) | ✔ `c51fc23` |
| 3 | Windows con Electron (`electron/`, `electron-builder.yml`; sustituye a Tauri) | ⏳ Etapa Electron |
| 4 | Actualizaciones reales (web / Windows / Android) | ✔ `b2dbeee` |
| 5 | GitHub Actions (`release.yml`: APK + instalador + `latest.json`) | ✔ |
| 6 | Pruebas (unitarias de `platform.ts`/versiones, build/test/Playwright) | ✔ |

### Base de rutas por plataforma

- `VITE_TARGET` = `web` (por defecto) · `android` · `desktop`.
- Scripts: `build:web` (base `/nido/`), `build:android` y `build:desktop` (base `./`).
  `npm run build` sigue compilando con base `./` para desarrollo y Playwright;
  GitHub Pages define `VITE_BASE` y manda sobre todo.
- En builds nativos el plugin PWA se desactiva: no se genera service worker ni
  manifiesto, y `initPWA()` no registra nada dentro de la app.
- Verificado: `dist/manifest.webmanifest` sale con `scope`/`start_url`/`id` =
  `/nido/` en `build:web`, y `./` en el build local; el build `android` no
  contiene `sw.js` ni `manifest.webmanifest`.

### Android (Capacitor 8)

- `capacitor.config.ts`: `appId com.nido.app`, `appName Nido`, `webDir dist`,
  sin `server.url` (lleva su propia copia).
- Proyecto en `android/` (generado con `npx cap add android`).
- Orientación vertical, `INTERNET` como único permiso, barra de estado `#18205F`
  y áreas seguras (`viewport-fit=cover` + `env(safe-area-inset-*)` ya en el CSS).
- Google: navegador del sistema (`@capacitor/browser`) + regreso por
  `com.nido.app://auth` con `App.addListener("appUrlOpen")`; la sesión se cierra
  con `exchangeCodeForSession`. En escritorio se avisa «Usa correo y contraseña».
- Íconos adaptativos, monocromo y splash en todas las densidades generados con
  `npm run native:assets` (sharp) desde el logo oficial.
- Firma: `android/keystore.properties` (ignorado) → release firmado; si no
  existe, el release usa la clave de depuración. Versión sincronizada desde
  `package.json` con `npm run android:version`.
- Scripts: `android:sync`, `android:build:debug`, `android:build:release`
  (APK → `dist-native/Nido-<versión>.apk`) y `android:bundle` (AAB).

### Windows con Electron

- Proyecto en `electron/`: `main.cjs` (proceso principal) y `preload.cjs`
  (puente seguro `window.nido`).
- `productName Nido`, `appId com.nido.app`, versión desde `package.json`.
- Carga el build `build:desktop` (`dist/index.html`, base `./`, HashRouter),
  `contextIsolation: true`, `nodeIntegration: false`, instancia única.
- Enlaces externos y login con Google abren en el navegador del sistema
  (`shell.openExternal`); el regreso usa el protocolo `com.nido.app://auth`,
  registrado por el instalador NSIS.
- Empaquetado `electron-builder.yml`: NSIS, instalación por usuario,
  `artifactName` `Nido-Setup-${version}.exe` y salida en `release/`.
- Íconos: `build/icon.png` (lo genera `npm run native:assets`); electron-builder
  lo convierte al `.ico` del instalador.
- Script `npm run dist:win` = `build:desktop` + `electron-builder --win nsis`.

### Actualizaciones por plataforma

- `src/lib/platform.ts` decide la rama (`web` / `android` / `desktop`);
  `isElectron()` mira `window.nido.isElectron`.
- `src/lib/updater.ts`: `fetchLatest` (web: `version.json`; Android: `latest.json`
  con respaldo en el `version.json` publicado), `getInstalledVersion`
  (`@capacitor/app` o `window.nido.appVersion`), `openDownload` (Electron:
  `window.nido.openExternal`; Android: `@capacitor/browser`),
  `checkDesktopUpdate` (`download` + `install` por el puente) y `relaunchApp`.
- `src/lib/useAppUpdate.ts` devuelve un estado único para las tres plataformas y
  `src/screens/Actualizaciones.tsx` usa el mecanismo real sin cambiar el diseño
  (mismas clases y textos en web): web instala el service worker y recarga;
  Android abre la descarga del APK; Windows descarga y luego instala y reinicia.
- Pruebas unitarias nuevas: `src/lib/platform.test.ts` y
  `src/lib/updater.test.ts` (comparación de versiones, notas, respaldo).

### Entorno tras el Paso 3

- Rust `stable-x86_64-pc-windows-msvc` se instaló con `winget` para la primera
  pasada de Tauri; ya **no se usa** (Windows se empaqueta con Electron).
- MSVC Build Tools: la instalación **falló por falta de espacio**
  (código `0x80070070`). Android SDK/`adb`: siguen sin estar.
- Por eso el APK **no se compila en esta máquina**: lo produce GitHub Actions
  (Paso 5). El instalador de Windows **sí** se intenta con Electron. Ver
  `PENDIENTES_MARIO.md`.

### Firma Android (Paso E)

- Keystore generado con `keytool` en
  `C:\Users\mario\nido-secrets\nido-release.jks`, contraseña en
  `keystore-password.txt` (nunca se imprime). Alias `nido`, PKCS12, 10 000 días.
- `android/keystore.properties` (ignorado por git) apunta a ese archivo, así
  `npm run android:build:release` firma en serio.
- En CI, el workflow decodifica el keystore desde `ANDROID_KEYSTORE_BASE64`; si
  falta, usa la clave de depuración y avisa.

### GitHub Actions (Paso 5)

`.github/workflows/release.yml`, tres trabajos:

| Trabajo | Runner | Qué hace |
| --- | --- | --- |
| `android` | ubuntu | Android SDK + Java 21, `android-build.mjs assembleRelease` → `Nido.apk` |
| `windows` | windows | `npm run dist:win` (electron-builder) → instalador NSIS, `.blockmap` y `latest.yml` |
| `release` | ubuntu | `gh release create`/`upload` con todos los artefactos |

Se dispara con una etiqueta `v*` o a mano. `deploy.yml` (Pages) no se tocó.

### Sincronización entre dispositivos (Paso I)

- Hoy la app escucha Realtime (`useRealtime`) e invalida la caché de TanStack
  Query.
- **Faltaba** en la publicación `supabase_realtime`: `other_incomes`,
  `savings_goals` y `savings_funds`. Y faltaba `replica identity full`, sin lo
  cual los **borrados** no se difundían con RLS.
- Migración **18** escrita y **NO aplicada**:
  `supabase/migrations/20260101000018_realtime_completo.sql`. Mario debe
  aplicarla.
- Refuerzo añadido en `src/data/provider.tsx`: refresca al volver a primer
  plano, al recuperar la conexión y cada minuto.
- Prueba automática `tests/sincronizacion.spec.ts` (dos usuarios del mismo
  hogar): se **omite** si no hay credenciales `NIDO_E2E_*` en el entorno y nunca
  las imprime. Checklist manual en `docs/PRUEBA_SINCRONIZACION.md`.

### Documentación

- `INSTALAR.md`: cómo instalar la PWA (Android/iPhone/PC), el APK y el
  instalador de Windows, con el aviso de SmartScreen.
- `PENDIENTES_MARIO.md`: solo lo que le toca a Mario, numerado.
- `docs/NATIVO.md`: resumen técnico del empaquetado y las actualizaciones.
- `docs/PRUEBA_SINCRONIZACION.md`: checklist manual y prueba automática.
- `PUBLICAR.md` y `README.md`: publicar la release nativa y qué hay en cada
  plataforma.

### Verificación de esta etapa

| Comprobación | Resultado |
| --- | --- |
| `npm run build` | ✔ limpio (base `./`) |
| `npm run build:web` | ✔ `manifest` con `/nido/`, `sw.js` presente |
| `npm run build:android` | ✔ sin `sw.js` ni manifiesto |
| `npx vitest run` | ✔ 64 pruebas (6 archivos) |
| `npx playwright test` | ✔ 48 pasan, 20 omitidas |
| APK firmado | pendiente de Mario/Actions (no se compila aquí) |
| Instalador de Windows | pendiente de Mario/Actions (no se compila aquí) |
| Pages | sin cambios en `deploy.yml` |
| Push a `main` | ⏳ bloqueado: token sin permiso `workflow` (ver `PENDIENTES_MARIO.md`, paso 0) |
| Release en GitHub | pendiente (se crea al subir la etiqueta `v1.0.0` tras los secretos) |
| Secretos en el repo | ninguno (`git ls-files` sin keystores ni claves) |

## Etapa Electron · Empaquetado de Windows (en curso)

Se **abandona Tauri** y Windows se empaqueta con **Electron + electron-builder**,
usando como referencia la configuración de la app AZKA Creative OS de Mario
(`C:\Users\mario\AZKA-Creative-OS`). No se toca el diseño, la matemática ni la
web publicada (`deploy.yml` sigue con base `/nido/`).

### Estado y decisiones

- Respaldo: etiqueta `respaldo-antes-electron` (para volver atrás si algo falla).
- Espacio en `C:` al empezar: **9.85 GB libres** (por debajo de 10 GB): se anotó
  y se vigiló. Al terminar quedaban ~8.7 GB (el empaquetado de Electron y el
  APK caben sin problema).
- Android SDK ya estaba en `%LOCALAPPDATA%\Android\Sdk` (platforms 34/36,
  build-tools 34/35, cmdline-tools, `adb`), así que **no hubo que instalarlo**.
- Todo se hizo en esta PC; **nada se subió** (`git push` sigue pendiente, ver
  abajo).

| Paso | Descripción | Estado | Commit |
| --- | --- | --- | --- |
| 1 | Quitar Tauri y detectar Electron (`window.nido`) | ✔ | `75d8ed8` |
| 2 | Windows con Electron (`electron/`, `electron-builder.yml`, `dist:win`) | ✔ | `278bea0` |
| 3 | APK de Android firmado | ✔ | `d8b72e5` |
| 4 | Actualizaciones por plataforma (pruebas del puente Electron) | ✔ | `cdfd68d` |
| 5 | Verificación final y documentación | ✔ | _(final)_ |

### Artefactos generados en esta PC (`release/`)

- `Nido-Setup-1.0.0.exe` (**88.92 MB**) + `.blockmap` + `latest.yml`.
- `Nido-1.0.0.apk` (**3.88 MB**), firmado con el keystore de Nido
  (`CN=Nido`; verificado con `apksigner`, esquema v2).
- La app empaquetada (`release/win-unpacked/Nido.exe`) arranca y se mantiene
  abierta (probada unos segundos).

### Detalles de Windows (Electron)

- `electron/main.cjs`: instancia única, `contextIsolation: true`,
  `nodeIntegration: false`, enlaces externos con `shell.openExternal` y
  protocolo `com.nido.app://auth` (lo registra el instalador NSIS).
- `electron/preload.cjs` expone `window.nido` (versión, abrir enlaces, login,
  actualizaciones con `electron-updater`).
- `electron-builder.yml`: NSIS por usuario, salida en `release/`,
  `Nido-Setup-${version}.exe`.
- `scripts/gen-icon-ico.mjs` (`npm run native:icon`) genera `build/icon.ico`,
  que NSIS exige (no acepta PNG).

**Nota de push:** los commits se quedan **locales** (sin `git push`): el token de
Mario no tiene permiso para el workflow. Ver el paso 0 de `PENDIENTES_MARIO.md`.
