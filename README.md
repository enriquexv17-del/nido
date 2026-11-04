# Nido

Sueldos y gastos del hogar, repartidos justo.

Nido es una app de finanzas para hogares de 1 a 3 personas en El Salvador.
Esta **Fase 1 es solo visual**: todo funciona con datos simulados, sin backend.
El diseño sigue la maqueta aprobada (ver `PLAN.md`).

## Requisitos

- Node.js 18 o superior (probado con Node 24)
- npm

## Cómo ejecutarlo en tu computadora

```bash
npm install
npm run dev
```

Vite abrirá `http://localhost:5173`. La primera pantalla es la bienvenida.

Para probar la versión optimizada (igual a producción):

```bash
npm run build
npm run preview
```

`preview` sirve en `http://localhost:4173`.

## Verlo desde tu celular (misma red Wi-Fi)

1. Levanta el servidor escuchando en toda la red:

   ```bash
   npm run dev -- --host
   ```

2. Vite mostrará una dirección **Network**, parecida a:

   ```
   http://192.168.1.42:5173
   ```

3. Escribe esa dirección en el navegador del teléfono. En iPhone, usa
   **Safari**; en Android, **Chrome**.

> Reemplaza `192.168.1.42` por la IP que muestre *tu* computadora.

## Instalarla como app (PWA)

Nido es una PWA instalable, así que no necesita tiendas de apps:

- **iPhone (Safari):** Compartir → «Añadir a pantalla de inicio».
- **Android (Chrome):** menú de tres puntos → «Instalar aplicación».

Una vez instalada abre a pantalla completa, funciona sin conexión y se
actualiza sola cuando hay una versión nueva.

## Apps para Android y Windows

Además de la PWA, Nido se empaqueta como app:

- **Android** (Capacitor): APK firmado, publicado en la sección *Releases*.
- **Windows** (Electron): instalador NSIS con actualización automática.

Las instrucciones para instalarlas (y el aviso de SmartScreen) están en
[`INSTALAR.md`](INSTALAR.md). El detalle técnico del empaquetado, en
[`docs/NATIVO.md`](docs/NATIVO.md); lo que debe hacer Mario, en
[`PENDIENTES_MARIO.md`](PENDIENTES_MARIO.md).

Los tres destinos comparten el mismo código; la base de rutas y el service
worker se eligen con `VITE_TARGET` (`npm run build:web`, `build:android`,
`build:desktop`).

## Actualizaciones

- **Web/PWA:** service worker; la app avisa y recarga.
- **Windows:** se descarga y se instala sola desde **Más → Actualizaciones**.
- **Android:** avisa y abre la descarga del APK (instalación manual).

## Publicarla

Como es un sitio estático, se puede publicar en cualquier hosting (Netlify,
Vercel, GitHub Pages, Cloudflare Pages…).

- **Netlify / Vercel:** conecta el repositorio; build `npm run build`,
  carpeta de salida `dist`.
- **GitHub Pages:** si el sitio vive en una subcarpeta (por ejemplo
  `usuario.github.io/nido`), define la base y compila:

  ```bash
  VITE_BASE=/nido/ npm run build
  ```

  El contenido de `dist/` se publica en la rama de Pages.

La variable `VITE_BASE` controla las rutas de los recursos. Por defecto es `./`,
que funciona tanto servido desde la raíz como desde una subcarpeta.

## Pruebas

```bash
npm run shots
```

Levanta el sitio compilado y con Playwright toma capturas de todas las rutas en
móvil (390×844) y PC (1280×800), además de verificar las interacciones
(hojas, deslizar gastos, diálogo de eliminar, modo desarrollador y hoja de
sueldo). Las imágenes quedan en `capturas/`.

## Estructura rápida

```
src/
  components/   piezas de UI reutilizables
  data/mock.ts  todos los datos simulados
  layout/       armazón de la app (barra lateral, pestañas, entrada)
  lib/          sesión y formato de moneda
  screens/      una pantalla por archivo
  styles/       tokens y estilos
tests/          pruebas de capturas e interacciones
```

## Detalles útiles

- **Moneda:** todo se muestra en dólares de Estados Unidos con `formatUSD()`.
- **Colores por persona:** fijos (`--p1`, `--p2`, `--p3`); el rosa (`--pk`) solo
  aparece en el selector de color del paso «hogar».
- **Modo desarrollador:** agrega `?dev=1` a la URL para ver el selector
  «Ver como» y cambiar de integrante. Sin ese parámetro no aparece.
- **Datos simulados:** editar `src/data/mock.ts` cambia toda la app.

## Siguientes fases (fuera de este alcance)

- Publicar el APK en una tienda (Google Play).
- Firma de código de pago para el instalador de Windows (quita el aviso de
  SmartScreen).
