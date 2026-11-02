# Nido · Plan de la Fase 1

Nido es una app de finanzas del hogar para 1–3 personas en El Salvador. Esta
Fase 1 es **solo visual**: toda la información vive en datos simulados y no hay
backend. El objetivo es que la app se vea y se sienta exactamente como la
maqueta aprobada, y que el código quede listo para las siguientes fases.

## Objetivo

Reproducir, con fidelidad de píxel, las pantallas de la maqueta visual de Nido:

- Pantallas de entrada: bienvenida, crear cuenta, configurar hogar, invitar y unirme.
- Pantallas de la app: inicio, ingresos, gastos, reparto, detalle del reparto,
  más, integrantes, descuentos de ley y actualizaciones.
- Las interacciones visuales (hojas, deslizar, diálogos, toggles, avisos) deben
  funcionar de verdad, aunque no guarden nada.

## Tecnología

| Pieza | Elección | Motivo |
| --- | --- | --- |
| Build | Vite 5 | rápido y sin configuración |
| UI | React 18 + TypeScript (`strict: true`) | tipado seguro y portable |
| Rutas | `react-router-dom` con `HashRouter` | funciona en cualquier hosting estático |
| Estilos | CSS propio con tokens (`:root`) | sin dependencias ni librerías de estado |
| Tipografía | Poppins (300/400/500/600/700) vía `@fontsource` | fiel a la maqueta y offline |
| PWA | `vite-plugin-pwa` (`registerType: autoUpdate`) | instalable y precacheada |
| Verificación | Playwright (capturas móvil y PC) | compara contra la maqueta |

**Fuera de alcance en esta fase:** Supabase, Capacitor, Tauri, Redux/Zustand,
`localStorage` de datos reales, modo oscuro y cualquier lógica de negocio.
El código queda organizado para conectar la Fase 2 sin reescribir la UI.

## Estructura

```
src/
  components/     piezas reutilizables (botones, hojas, filas, iconos…)
  data/mock.ts    TODOS los datos simulados y sus tipos
  layout/         AppShell, Sidebar, TabBar, EntryShell
  lib/            sesión (persona actual, modo dev), formato de moneda
  screens/        una pantalla por archivo
  styles/         tokens.css · global.css · components.css · screens.css
tests/            capturas de rutas e interacciones (Playwright)
scripts/          generación de íconos y ayudas de recorte
public/           íconos PWA, favicon, apple-touch-icon
```

Reglas de oro del código:

1. **Ningún componente escribe un valor a mano.** Todo sale de `src/data/mock.ts`
   a través de hooks (`usePeople`, `useExpenses`, `useHousehold`, `useActivity`,
   `useMonths`).
2. **Un solo formateador de moneda:** `formatUSD()` (y `formatUSDPlain()` para
   montos sin signo secundario). Nunca se concatenan dólares a mano.
3. **Colores por persona fijos:** `--p1`, `--p2`, `--p3`. El rosa `--pk` solo
   aparece en el selector de color del paso «hogar».
4. Sin modo oscuro, sin dependencias de estado, sin animación que estorbe
   (`prefers-reduced-motion` respetado).

## Sistema de diseño

- Paleta añil/jade/maíz/coral sobre fondo `--bg`, con tinta `--ink` y gris `--muted`.
- Radios, sombras y medidas centralizados en `src/styles/tokens.css`.
- Logo e íconos son SVG en línea (`Icon.tsx`), sin librerías de íconos.
- Tipografía Poppins con pesos 300–700.

## Rutas

Entrada (sin barra inferior):

| Ruta | Pantalla |
| --- | --- |
| `/bienvenida` | Bienvenida |
| `/cuenta` | Crear cuenta |
| `/hogar` | Configurar hogar |
| `/invitar` | Invitar |
| `/unirme` | Unirme con código |

App (dentro de `AppShell`):

| Ruta | Pantalla |
| --- | --- |
| `/inicio` | Inicio |
| `/ingresos` | Ingresos |
| `/gastos` | Gastos del hogar |
| `/reparto` | Reparto |
| `/reparto/detalle` | Detalle del reparto |
| `/mas` | Más |
| `/mas/integrantes` | Integrantes |
| `/mas/descuentos` | Descuentos de ley |
| `/mas/actualizaciones` | Actualizaciones |

`/` y cualquier ruta desconocida (`*`) redirigen a `/bienvenida`.

## Interacciones visuales

- **Hojas (sheets):** suben en 220 ms, fondo oscuro, se cierran con la X,
  «Cancelar», tocando el fondo o con `Esc`.
- **Gastos:** deslizar a la izquierda revela «Editar» y «Eliminar»; en PC
  (≥1024 px) además hay un botón de tres puntos.
- **Editar gasto:** muestra el monto anterior tachado junto al campo editable.
- **Eliminar:** diálogo de confirmación centrado, cerrable igual que las hojas.
- **Ingresos:** hoja de sueldo con toggles de AFP/ISSS/ISR y cálculo de «Recibirás».
- **Integrantes:** hoja para agregar persona y flujo de invitación.
- **Chips, segmentados, toggles:** con estado visual real.
- **Portapapeles:** «Copiar código» muestra un aviso (toast); el enlace de
  WhatsApp abre `wa.me` con el texto ya escrito.
- **Modo dev:** el selector «Ver como» solo aparece con `?dev=1` en la URL.

## Responsive

- **PC (≥1024 px):** barra lateral fija de 210 px y sin barra de pestañas.
  Solo Inicio tiene diseño de escritorio (columnas y tabla); el resto centra su
  contenido en una columna de máximo 720 px.
- **Tablet (768–1023 px):** diseño móvil centrado, ancho máximo 520 px, con
  barra de pestañas.
- **Móvil (<768 px):** ancho completo, barra de pestañas y áreas seguras de iOS.

## PWA

- `registerType: 'autoUpdate'`, precache de todos los recursos y del manifest.
- Íconos 192, 512 y maskable 512, más `apple-touch-icon` y `favicon`.
- Metas de iPhone (`apple-mobile-web-app-*`), `viewport-fit=cover` y
  `env(safe-area-inset-*)`.
- Se evita el zoom por doble toque y el rebote del fondo; los campos móviles
  usan 16 px para que iOS no haga zoom.
- `base` se toma de `VITE_BASE` (por defecto `./`) para publicar en cualquier ruta.

## Pasos de trabajo (y commits)

1. `chore: andamiaje de Vite + React + TS + PWA`
2. `feat: tokens de diseño y estilos globales`
3. `feat: datos simulados y sesión (persona actual, modo dev)`
4. `feat: componentes base e interacciones (hojas, diálogos, filas, avisos)`
5. `feat: pantallas de entrada (bienvenida, cuenta, hogar, invitar, unirme)`
6. `feat: pantallas de la app y layout responsive (barra lateral / pestañas)`
7. `test: capturas de rutas e interacciones con Playwright`
8. `docs: plan y guía de uso`

## Verificación

- `npm run build` compila limpio (`tsc -b` con `strict: true` + `vite build`),
  sin errores ni avisos en consola.
- `npm run shots` captura las 14 rutas en 390×844 y 1280×800, y verifica las
  interacciones (hojas, deslizar/3 puntos, diálogo, modo dev, hoja de sueldo).
- Revisión visual pantalla por pantalla contra la maqueta.

## Desviación respecto al pedido original

El pedido mencionaba una carpeta `referencia/` y un `mockup.html` como fuente
visual. **Ninguno de los dos existe en el proyecto ni en el equipo.** La única
referencia disponible es el PDF renderizado `Nido_maqueta_visual.pdf`
(13 páginas, en `C:\Users\mario\Downloads\`), que se usó como fuente de verdad
para colores, medidas, textos e íconos. Cualquier detalle que en el PDF se viera
borroso se amplió con `sharp` y se decidió de la forma más fiel posible.
