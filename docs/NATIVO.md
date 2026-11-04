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

## Windows (Tauri 2)

- Config: `src-tauri/tauri.conf.json` (`com.nido.app`, `Nido`, versión leída de
  `package.json`).
- Ventana 1100×760, mínimo 400×640. Bundle NSIS + MSI, instalación por usuario.
- Compilar:
  ```powershell
  npm run tauri:build   # scripts/tauri-build.mjs
  ```
  El script compila `build:desktop`, ejecuta `tauri build`, firma los artefactos
  del actualizador y los copia (con `latest.json`) a `dist-native/`.
- Requiere: Rust (`rustup`), **Visual Studio Build Tools** con «Desarrollo para
  el escritorio con C++» y WebView2 (viene con Windows 10/11).

## Actualizaciones

Cada plataforma usa su mecanismo (`src/lib/updater.ts` y
`src/lib/useAppUpdate.ts`):

- **Web/PWA:** service worker `autoUpdate` en modo «prompt»; la pantalla
  Actualizaciones recarga con la versión nueva.
- **Android:** lee `latest.json` de la última release (si falla, el
  `version.json` publicado), lo compara con la versión instalada
  (`@capacitor/app`) y abre la descarga del APK (`@capacitor/browser`). La
  instalación es manual, y la pantalla lo explica.
- **Windows:** `@tauri-apps/plugin-updater` (comprobar y descargar) y
  `@tauri-apps/plugin-process` (reiniciar). El endpoint es
  `https://github.com/enriquexv17-del/nido/releases/latest/download/latest.json`.

### Claves del actualizador

- Privada: `C:\Users\mario\nido-secrets\nido-updater.key` (+ contraseña en
  `updater-password.txt`). **Nunca** al repositorio.
- Pública: `plugins.updater.pubkey` en `src-tauri/tauri.conf.json`.
- Se generaron con `npx tauri signer generate` (script `scripts/_gen-updater-keys.mjs`).
- Si cambias de claves, hay que volver a publicar una versión: las instaladas
  solo aceptan firmas hechas con la clave privada correspondiente.

## Publicar

`.github/workflows/release.yml`. Se dispara con una etiqueta `v*`:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

Compila el APK (Linux, con Android SDK del runner) y el instalador (Windows,
con Rust), y crea la release con `gh release create` adjuntando:

`Nido.apk`, `Nido-setup.exe` (+ `.sig`), `Nido.msi` (+ `.sig`) y `latest.json`.

Nunca se suben keystores ni claves privadas.

## Estructura

```
android/                     proyecto Capacitor
src-tauri/                   proyecto Tauri
scripts/build.mjs            build por destino
scripts/android-build.mjs    APK/AAB
scripts/android-version.mjs  versión de Android
scripts/gen-native-assets.mjs íconos y splash
scripts/tauri-build.mjs      instalador de Windows
scripts/make-latest-json.mjs manifiesto del actualizador
.github/workflows/deploy.yml  web a Pages
.github/workflows/release.yml APK + instalador + release
```
