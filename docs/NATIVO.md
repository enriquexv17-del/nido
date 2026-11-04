# Nido · empaquetado nativo (resumen técnico)

Documento corto para entender cómo se generan el APK de Android, el instalador
de Windows y cómo se actualizan. Para instalarlos, mira `INSTALAR.md`; para lo
que debe hacer Mario, `PENDIENTES_MARIO.md`.

## Un mismo código, tres destinos

`VITE_TARGET` decide la base de rutas y si se activa el service worker:

| Destino | Comando | Base de rutas | Service worker |
| --- | --- | --- | --- |
| web (Pages) | `npm run build:web` | `/nido/` | sí |
| Android | `npm run build:android` | `./` | no |
| Windows | `npm run build:desktop` | `./` | no |
| pruebas locales | `npm run build` | `./` | sí |

`VITE_BASE` (variable de entorno) manda sobre todo: GitHub Pages la define con
el nombre del repositorio. La detección de plataforma está en
`src/lib/platform.ts` (`web` / `android` / `desktop`).

## Android (Capacitor 8)

- Config: `capacitor.config.ts` (`com.nido.app`, `Nido`, `webDir dist`).
- Proyecto: `android/`. Orientación vertical y solo permiso `INTERNET`.
- Enlace profundo del login: `com.nido.app://auth`.
- Íconos y splash: `npm run native:assets` (script `scripts/gen-native-assets.mjs`).
- Versión: `npm run android:version` escribe `android/version.properties` desde
  `package.json` (`versionCode` = major·10000 + minor·100 + patch).
- Compilar:
  ```powershell
  npm run android:sync          # build + versión + cap sync
  npm run android:build:release # APK firmado -> dist-native/Nido-<versión>.apk
  npm run android:bundle        # AAB para la tienda
  ```
- Firma: `android/keystore.properties` (ignorado por git) apunta al keystore de
  `C:\Users\mario\nido-secrets\nido-release.jks`. Sin ese archivo, el release se
  firma con la clave de depuración.

## Windows (Electron)

- Config de empaquetado: `electron-builder.yml` (NSIS, instalación por usuario,
  salida en `release/`).
- Proceso principal: `electron/main.cjs`; puente seguro `electron/preload.cjs`.
- Ventana de escritorio, `contextIsolation: true`, `nodeIntegration: false` e
  instancia única. Carga `dist/index.html` (build `desktop`, base `./`).
- Enlaces externos y login con Google se abren en el navegador del sistema
  (`shell.openExternal`); el regreso usa el protocolo `com.nido.app://auth`.
- Compilar:
  ```powershell
  npm run dist:win   # build:desktop + electron-builder --win nsis
  ```
  Deja `release\Nido-Setup-<versión>.exe`, su `.blockmap` y `latest.yml`.

## Actualizaciones

Cada plataforma usa su mecanismo (`src/lib/updater.ts` y
`src/lib/useAppUpdate.ts`):

- **Web/PWA:** service worker en modo «prompt»; la pantalla Actualizaciones
  recarga con la versión nueva.
- **Android:** lee `latest.json` de la última release (si falla, el
  `version.json` publicado), lo compara con la versión instalada
  (`@capacitor/app`) y abre la descarga del APK (`@capacitor/browser`). La
  instalación es manual, y la pantalla lo explica.
- **Windows (Electron):** `electron-updater` en el proceso principal, expuesto
  por `window.nido` (comprobar, descargar, instalar y reiniciar). El proveedor
  es GitHub (`enriquexv17-del/nido`); si no hay release legible, la pantalla
  muestra «versión actual» sin romperse.

## Publicar

`.github/workflows/release.yml`. Se dispara con una etiqueta `v*`:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

Compila el APK (Linux, con Android SDK del runner) y el instalador (Windows,
con electron-builder), y crea la release con `gh release create` adjuntando:

`Nido.apk`, `Nido-Setup-<versión>.exe` (+ `.blockmap`), `latest.yml` y
`latest.json`.

Nunca se suben keystores ni claves privadas.

## Estructura

```
android/                     proyecto Capacitor
electron/                    proceso principal y preload de Electron
scripts/build.mjs            build por destino
scripts/android-build.mjs    APK/AAB
scripts/android-version.mjs  versión de Android
scripts/gen-native-assets.mjs íconos, splash y build/icon.png
scripts/make-latest-json.mjs manifiesto de versión (Android)
electron-builder.yml         empaquetado de Windows (NSIS)
.github/workflows/deploy.yml  web a Pages
.github/workflows/release.yml APK + instalador + release
```
