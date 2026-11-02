# PROMPT MAESTRO — Fase 3 de Nido

> Pega este archivo completo como instrucción en una sesión de OpenCode abierta
> en `C:\Users\mario\OneDrive\Escritorio\APP DE FINANANSAS`. Está pensado para
> ejecutarse **de corrido, sin pedir permiso entre pasos**, y terminar
> entregando **solo la URL** para verificar.

---

## 0) Rol y objetivo

Eres OpenCode trabajando en **Nido**, una PWA de finanzas del hogar (React +
TypeScript + Vite). La Fase 2 ya está terminada y congelada en la etiqueta
`v0.9.0-testeo`. Ahora implementa la **Fase 3**: dos apartados nuevos, sutiles y
totalmente editables, sin romper **nada** de lo que ya funciona.

Al terminar debes: compilar limpio, pruebas en verde, capturas nuevas y
**entregar únicamente la URL** donde se puede ver (más un resumen breve).

Trabaja en español. Todo el texto visible al usuario va en español, con
acentos correctos, sin emojis en la interfaz.

---

## 1) Reglas de oro (NO romper)

1. **No cambies el diseño de la Fase 1**: colores, textos, radios, tipografía,
   estructura de pantallas y barra inferior quedan igual. Solo se **agregan**
   dos apartados y su contenido. Reutiliza clases y tokens existentes.
2. **No toques la matemática dorada** del hogar. Estos valores deben seguir
   exactos (modo demostración, mes `2026-11`):
   - Netos personales: **$359.00 / $493.62 / $450.00** (Enrique / Joaquín / Jefferson).
   - Reparto de gastos «según sueldo»: **146.48 / 201.41 / 183.61**.
   - «Partes iguales»: **177.19 / 177.16 / 177.15**.
   - Total de gastos del hogar: **$531.50**.
3. Los ingresos extra y los ahorros son **personales**: **no** entran al neto
   del hogar ni al reparto. No alteres `derive()` en lo que respecta al reparto.
4. `strict: true`; `npm run build` (`tsc -b && vite build`) debe salir **sin
   errores ni avisos**. `npx vitest run` en verde. Playwright en verde.
5. **Cero errores/avisos de consola** en todas las rutas (ya existe la prueba
   `tests/consola.spec.ts`; agrégale las rutas nuevas).
6. No inventes ni hagas commit de claves. `.env` sigue ignorado. Solo clave
   pública (`anon`) en el cliente.
7. Un **commit por paso** (o por grupo coherente), mensajes en español, sin
   acentos en el asunto (Windows). Sin `--force`, sin reescribir historia.
8. Ningún archivo fuente nuevo de más de ~200 líneas escritas de golpe: parte
   el trabajo en pasos.
9. `prefers-reduced-motion` ⇒ fades de 120 ms (ya está resuelto en tokens;
   respétalo). Anima solo `transform` y `opacity`.

---

## 2) Estado actual (contexto que debes respetar)

- Capa de datos detrás de una misma interfaz en `src/data/`:
  - `types.ts` (tipos crudos y derivados), `mock.dev.ts` (almacén de
    demostración con `localStorage` + `BroadcastChannel`), `api.ts` (lectura y
    escritura, con rama demo y rama Supabase), `queries.ts` (hooks de lectura),
    `mutations.ts` (hooks de escritura), `selectors.ts` (`derive()`, memoizado
    con `WeakMap`), `provider.tsx`, `index.ts` (barril público).
- Mes activo: hook `useMonth()` (global) y `useMonths()` (Sep/Oct/Nov fijos).
  `DEFAULT_MONTH` en demo es `"2026-11"`.
- Persona actual: `useSession().person` (Enrique es «tú» en demo).
- Componentes reutilizables: `Sheet`, `Dialog`, `Field`, `Button`/`IconButton`,
  `Chip`, `Toast`, `EmptyState`/`ErrorState`/`ScreenSkeleton`, `BackHeader`/
  `ScreenHeader`, `Icon`, `IconSquare`, `CountUp`.
- Estilos: `src/styles/{tokens,global,components,screens,motion}.css`.
  Tokens: `--p1 --p2 --p3 --maiz --coral --jade --ink --muted --line --card
  --soft --soft-line`, radios `--r-*`, sombras `--shadow-card/--shadow-float`.
  Hay `.card`, `.dark-card`, `.settings-list`, `.settings-row`, `.settings-title`,
  `.settings-sub`, `.state-card`, `.progress`/`.progress span`/`.progress-foot`,
  `.note`, `.chip-row`, `.home-stagger`, `.help-text`.
- Rutas en `src/App.tsx` (HashRouter). Pantalla «Más»: `src/screens/Mas.tsx`
  con un arreglo `rows: Row[]` que se pinta como `.settings-row` (Link + chevron).
- Subpantallas existentes de ejemplo: `Integrantes.tsx` (CRUD con Sheet + Dialog
  + Toast) y `Descuentos.tsx` (`BackHeader` + tarjetas).

---

## 3) Qué vas a agregar (resumen)

Dos apartados nuevos, dentro de la pestaña **Más** (no se toca la barra inferior):

- **A · Otros ingresos** (personales): registrar ingresos extra por negocio o
  trabajo aparte (marca de ropa, edición de video, etc.) con **nombre, qué fue,
  monto y día**, totalmente **agregable / editable / eliminable**.
- **B · Ahorros y metas** (personales): (1) **metas** manuales editables
  (nombre, monto objetivo, ahorrado, frecuencia, fecha) con progreso y cálculo
  de cuánto apartar por día/semana/mes; y (2) **ahorro automático**: a partir de
  lo que «te sobra» del mes, un reparto en fondos **editables** (fondo de
  emergencia, seguro de vida, marca de ropa, …) con porcentajes que también se
  pueden agregar/editar/eliminar.

---

## 4) Modelo de datos (nuevo)

En `src/data/types.ts` agrega (con JSDoc breve, estilo del archivo):

```ts
export interface RawOtherIncome {
  id: string;
  memberId: string;    // a quién pertenece (personal)
  month: string;       // YYYY-MM
  source: string;      // "Marca de ropa", "Edición de video"
  note: string;        // qué fue
  amount: number;      // cuánto (dólares)
  day?: number;        // 1–31 (opcional)
  createdAt: string;
}

export type SavingsFrequency = "daily" | "weekly" | "monthly";

export interface RawGoal {
  id: string;
  memberId: string;
  name: string;                 // "Teléfono nuevo"
  target: number;               // monto objetivo
  saved: number;                // ahorrado hasta hoy
  frequency: SavingsFrequency;  // cada cuánto apartas
  dueMonth?: string;            // YYYY-MM (opcional)
  createdAt: string;
}

export interface RawFund {
  id: string;
  memberId: string;
  name: string;   // "Fondo de emergencia", "Seguro de vida", "Marca de ropa"
  pct: number;    // 0–100 de lo que sobra
  note?: string;
}
```

Extiende `Snapshot` con tres arreglos nuevos:

```ts
otherIncomes: RawOtherIncome[];
goals: RawGoal[];
funds: RawFund[];
```

No cambies las interfaces de reparto (`Person`, `Expense`, `Household`).

---

## 5) Cálculos (nuevo archivo `src/lib/calc/savings.ts`)

Funciones **puras**, con centavos enteros y mayor resto (usa `./money`:
`toCents`, `fromCents`, `largestRemainder`). Exporta desde `src/lib/calc/index.ts`.
Escribe `src/lib/calc/savings.test.ts` (Vitest).

```ts
/** Disponible personal del mes = neto + otros ingresos − tu parte de gastos. */
export function availableToSave(input: {
  net: number; share: number; otherIncomes: number;
}): number; // nunca negativo

/** Reparte `available` entre fondos por su `pct` (si suman >100, escala
 *  proporcional; la suma repartida nunca supera `available`). Devuelve montos
 *  por `fundId`, en dólares, sumando exacto (mayor resto). */
export function distributeFunds(
  available: number,
  funds: { id: string; pct: number }[]
): { fundId: string; amount: number }[];

export interface GoalProgress {
  remaining: number;     // objetivo − ahorrado
  periodsLeft: number;   // periodos (día/semana/mes) hasta `dueMonth` o, si no
                         // hay fecha, hasta 12 periodos por defecto
  perPeriod: number;     // cuánto apartar cada periodo
  progressPct: number;   // 0–100
}
export function goalProgress(
  goal: { target: number; saved: number; frequency: SavingsFrequency; dueMonth?: string },
  fromMonth: string
): GoalProgress;
```

Reglas de `goalProgress`:
- `daily`: días naturales restantes hasta el **último día** de `dueMonth`
  (o 30 si no hay fecha); `weekly`: `ceil(días/7)`; `monthly`: meses completos
  hasta `dueMonth` (mínimo 1).
- `progressPct` redondeado a 1 decimal, acotado a [0, 100].

`distributeFunds` en centavos y con `largestRemainder` para que la suma sea
exacta. Casos de prueba: suma de pct < 100, = 100, > 100 (escala), 0 fondos,
disponible 0.

---

## 6) Capa de datos (conexión)

Sigue **exactamente** los patrones existentes (demo + Supabase en la misma
función, con `if (!isSupabaseConfigured || !supabase)`).

1. `src/data/mock.dev.ts`
   - Extiende `MOCK_SEED` con ejemplos (ver §10).
   - Añade un `normalize(snapshot)` que, al cargar de `localStorage`, complete
     `otherIncomes/goals/funds` con `[]` si faltan (para no romper datos viejos).
     Úsalo tanto en `load()` como en `reset()`.
   - Métodos nuevos en `MockStore` (con `pushActivity`, como los de gastos):
     `addOtherIncome`, `updateOtherIncome`, `deleteOtherIncome`;
     `addGoal`, `updateGoal`, `deleteGoal`;
     `addFund`, `updateFund`, `deleteFund`.
     `id` con `uid()`; `createdAt` con `new Date().toISOString()`.
2. `src/data/api.ts`
   - Tipos de entrada: `OtherIncomeInput`, `GoalInput`, `FundInput`.
   - Funciones: `createOtherIncome/updateOtherIncome/deleteOtherIncome`,
     `createGoal/updateGoal/deleteGoal`, `createFund/updateFund/deleteFund`.
   - Rama demo → métodos del almacén. Rama Supabase → tablas
     `other_incomes`, `savings_goals`, `savings_funds` (columnas en §11).
   - En `loadRealSnapshot`, lee también esas tres tablas (todas del hogar;
     filtra por `month` solo `other_incomes`) y mapéalas al `Snapshot`.
3. `src/data/mutations.ts`
   - `useOtherIncomeActions()` → `{ createOtherIncome, updateOtherIncome,
     deleteOtherIncome, isSaving }`.
   - `useGoalActions()` y `useFundActions()` análogos.
   - Invalida `["snapshot"]` como los demás.
4. `src/data/queries.ts`
   - `useOtherIncomes()` → los del **mes activo**.
   - `useGoals()` y `useFunds()` → los de la persona actual
     (por `useSession().person.id`; en demo caen en «tú»).
   - `useSavingSummary()` → `{ net, extra, share, available, distribution,
     totalSaved, free }` combinando `useSession().person`, `useOtherIncomes()`,
     `useFunds()` y `calcSh`/`distributeFunds`.
   - No rompas los hooks actuales.
5. `src/data/index.ts`: exporta los tipos, hooks y `SavingsFrequency` nuevos.

> Nota: los `useSession` no viven en `data`; para no crear ciclos, calcula la
> persona actual igual que `mutations.ts` (`useAuth` + `snapshot.members`),
> tomando la primera como respaldo. Mantén el mismo criterio en queries.

---

## 7) Pantallas nuevas

Dos pantallas, con `BackHeader over="Más"`, dentro de `src/screens/`.

### A) `OtrosIngresos.tsx` — «Otros ingresos»

- `BackHeader over="Más" title="Otros ingresos"`.
- Nota informativa (`.note`): «Ingresos extra personales (negocios, trabajos
  aparte). No entran al reparto del hogar.»
- `.dark-card` con «Total extra de {mes}» y la suma del mes activo
  (`formatUSD`), animada con `CountUp`.
- Lista de tarjetas (`.card`), cada una con: fuente (título), qué fue (sub),
  día si lo hay, y monto a la derecha. Tocar ⇒ editar (Sheet); botón papelera ⇒
  `Dialog` de confirmación; `Toast` al guardar/eliminar.
- `Button` «Agregar ingreso» ⇒ `Sheet` con `Field`s: **Fuente** (nombre del
  negocio), **Qué fue**, **Monto** (numérico, `inputMode="decimal"`),
  **Día** (opcional, 1–31). Validación: fuente ≥ 2 letras y monto > 0.
- Estados: `ScreenSkeleton` mientras carga, `ErrorState` con reintento, y
  `EmptyState` cuando no hay ingresos («Aún no hay ingresos extra»).
- Animación: reutiliza `.home-stagger`; entrada de tarjetas escalonada
  (stagger 40–60 ms) con `m.div`/`m.li`. Solo `transform`/`opacity`.

### B) `Ahorros.tsx` — «Ahorros y metas»

- `BackHeader over="Más" title="Ahorros y metas"`.
- **Bloque 1 · Lo que te sobra este mes**: `.dark-card` con `available`
  (neto + otros ingresos − tu parte de gastos) y desglose en filas
  («Tu sueldo neto», «Otros ingresos», «Tu parte de gastos»).
- **Bloque 2 · Ahorro automático**: lista de fondos editables. Cada fila:
  nombre, porcentaje editable (Slider simple o `Field` numérico) y **monto
  calculado** (`distributeFunds`). Botón «Agregar fondo» (Sheet: nombre, %,
  nota) y eliminar (Dialog). Pie: «Total ahorro» y «Queda libre».
  Si la suma de % > 100, muestra un aviso suave (`.note--blue`).
- **Bloque 3 · Mis metas**: tarjetas con nombre, `saved`/`target`
  (`formatUSD`), barra de progreso (usa `.progress`, ancho vía
  `transform: scaleX(progressPct/100)`), y «Aparta {perPeriod} {frecuencia}
  para {dueMonth}». Agregar/editar (Sheet: nombre, objetivo, ahorrado,
  frecuencia con `Chip`s Diario/Semanal/Mensual, mes límite opcional) y
  eliminar (Dialog). Botón «Sumar ahorro» para incrementar `saved` rápido
  (Sheet con monto).
- Estados: `ScreenSkeleton`/`ErrorState`/`EmptyState` en cada bloque vacío.
- Animación: entrada escalonada de bloques y tarjetas; barras de progreso con
  `transform`; respeta `prefers-reduced-motion`.

---

## 8) Rutas y accesos

En `src/App.tsx`, dentro del grupo `RequireSession`:

```tsx
<Route path="/mas/otros-ingresos" element={<OtrosIngresos />} />
<Route path="/mas/ahorros" element={<Ahorros />} />
```

En `src/screens/Mas.tsx`, agrega **dos filas** al arreglo `rows` (antes de
«Actualizaciones»), con `.settings-row`:

- **Otros ingresos** → `/mas/otros-ingresos`; sub dinámico:
  «{total} este mes» (o «Sin ingresos extra»).
- **Ahorros y metas** → `/mas/ahorros`; sub dinámico:
  «{n} metas · {ahorrado}».

Iconos: agrega dos íconos nuevos a `src/components/Icon.tsx` en el mismo estilo
24×24 (trazo, `strokeWidth` 2): una **alcancía** (`piggy`) para Ahorros y unas
**monedas** (`coins`) para Otros ingresos. No cambies los íconos existentes.

---

## 9) Estilos y animación

- Añade las clases nuevas en `src/styles/screens.css` (sección «Fase 3») usando
  **solo** tokens existentes. Nada de colores, radios ni sombras nuevas.
- Tarjetas: reutiliza `.card` / `.dark-card`. Filas: reutiliza el patrón de
  `.settings-*` o `.income-card`. Barra de progreso: reutiliza `.progress`.
- Animación: `transform`/`opacity` únicamente; `will-change` solo mientras se
  anima; curvas y duraciones desde `src/motion/tokens.ts`
  (`EASE_CINE`, `SPRING_UI`, `SPRING_HEAVY`, `DUR_*`, `STAGGER`).
- Reduced motion: fades de 120 ms (ya cubierto por `motion.css`).

---

## 10) Datos de ejemplo (demo) — para que se vea con contenido

En `MOCK_SEED` (mes `2026-11` = `M`), persona «enrique» (tú):

- `otherIncomes`:
  - `{ source: "Marca de ropa", note: "Venta de 3 camisas", amount: 60, day: 12 }`
  - `{ source: "Edición de video", note: "Reel para cafetería", amount: 45, day: 20 }`
- `goals`:
  - `{ name: "Teléfono nuevo", target: 300, saved: 90, frequency: "monthly" }`
  - `{ name: "Fondo de emergencia", target: 500, saved: 120, frequency: "monthly" }`
- `funds`:
  - `{ name: "Fondo de emergencia", pct: 40 }`
  - `{ name: "Seguro de vida", pct: 20 }`
  - `{ name: "Marca de ropa", pct: 40 }`

Agrega también un par de ejemplos en `2026-10` (PREV) si es sencillo, para que
cambiar de mes muestre variación. **No** toques sueldos ni gastos de ejemplo.

---

## 11) Supabase (preparado, SIN aplicar)

Crea `supabase/migrations/20260101000014_savings.sql` (numera después de las
existentes) con, como mínimo:

- Tabla `other_incomes` (`id`, `household_id`, `member_id`, `month`, `source`,
  `note`, `amount`, `day`, `created_at`).
- Tabla `savings_goals` (`id`, `household_id`, `member_id`, `name`, `target`,
  `saved`, `frequency`, `due_month`, `created_at`).
- Tabla `savings_funds` (`id`, `household_id`, `member_id`, `name`, `pct`, `note`).
- RLS coherente con las demás migraciones (cada quien ve lo de su hogar y edita
  lo suyo), y triggers de `activity` si el patrón existente lo hace.

**No** apliques migraciones ni toques Supabase real. Solo deja el SQL escrito.
Actualiza `supabase/README.md` si hace falta con una línea.

---

## 12) Pruebas

- **Vitest** (`src/lib/calc/savings.test.ts`): `availableToSave`,
  `distributeFunds` (suma exacta, casos límite) y `goalProgress` (diario,
  semanal, mensual, sin fecha). No modifiques la prueba dorada existente.
- **Playwright**: crea `tests/fase3.spec.ts` (móvil, `test.skip` en PC):
  1. En **Más**, existen las filas «Otros ingresos» y «Ahorros y metas».
  2. **Otros ingresos**: crear «Marca de ropa» por $60 → aparece y el total del
     mes sube; editar a $80; recargar (persistencia local); eliminar → vuelve.
  3. **Ahorros**: se ven los fondos con montos y el «total ahorro»; crear una
     meta «Prueba» con objetivo $300 → muestra «Aparta …»; eliminarla.
- Agrega `/mas/otros-ingresos` y `/mas/ahorros` a los arreglos `ROUTES` de
  `tests/consola.spec.ts`, `tests/a11y.spec.ts` y `tests/capturas-fase2.spec.ts`
  (este último: guarda capturas en `capturas-fase3/`; agrega `capturas-fase3`
  a `.gitignore`).
- No rompas `tests/tiempo-real.spec.ts`, `tests/meses.spec.ts`,
  `tests/flujos.spec.ts` ni los valores dorados.

---

## 13) Pasos y commits (de corrido, sin pedir permiso)

1. `feat: modelo de datos de ingresos extra, metas y fondos`
   (tipos + normalización + almacén demo).
2. `feat: calculo de ahorro disponible, fondos y metas (con pruebas)`
   (`calc/savings.ts` + `savings.test.ts`).
3. `feat: capa de datos de ingresos extra y ahorros (api, queries, mutations)`
   + migración SQL de Supabase.
4. `feat: pantalla de otros ingresos (CRUD personal)`
   (ruta + fila en Más + estilos + captura).
5. `feat: pantalla de ahorros y metas (fondos, automatico y objetivos)`
   (ruta + fila en Más + estilos + captura).
6. `test: flujos de ingresos extra y ahorros + rutas nuevas en consola/a11y`
   (Playwright verde).
7. `docs: estado de la Fase 3 en PLAN2` (marca lo hecho y las desviaciones).

Después de **cada** paso: `npm run build` limpio y `npx vitest run` verde.
Antes del commit final: `npx playwright test` completo en verde.

---

## 14) Verificación y entrega final

Ejecuta y confirma:

```powershell
npm run build
npx vitest run
npx playwright test
npm run perf
```

Al terminar, genera las capturas de las dos pantallas nuevas (móvil y PC) en
`capturas-fase3/` y deja `npm run preview` sirviendo en `http://localhost:4173`.

**Entrega final (mensaje corto, en este orden):**

1. 2–3 líneas de resumen de lo agregado.
2. Tabla minicompacta: build / vitest / playwright / consola (✔/✖).
3. Valores que NO cambiaron (146.48 / 201.41 / 183.61 y 531.50) confirmados.
4. Diferencias o supuestos (si hubo).
5. **La URL para verlo**: `http://localhost:4173` (y, si se quiere probar en el
   teléfono: `npm run dev -- --host` → `http://<tu-IP>:5173`).

No hagas más preguntas: si algo es ambiguo, decide con criterio, respeta las
reglas de oro y **documenta la decisión** en `PLAN2.md` como desviación.
