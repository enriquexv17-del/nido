/**
 * Actualizaciones por plataforma. Todas las versiones publicadas salen de la
 * misma release de GitHub (`enriquexv17-del/nido`):
 *
 * - **web/PWA:** `version.json` en el propio sitio + service worker.
 * - **Android:** `latest.json` de la última release y, si no se puede leer,
 *   `version.json` publicado. El APK se descarga desde la release.
 * - **Windows (Electron):** `electron-updater` en el proceso principal, expuesto
 *   de forma segura por `window.nido`; descarga, instala y reinicia.
 *
 * Nada de aquí imprime ni guarda secretos: solo URLs públicas.
 */
import { APP_VERSION } from "./appInfo";
import { getPlatform, nidoBridge, type Platform } from "./platform";

/** Carpeta de descargas de la última release (los nombres los fija la publicación). */
export const RELEASES_LATEST =
  "https://github.com/enriquexv17-del/nido/releases/latest/download";
/** Manifiesto que escribe el flujo de publicación para el actualizador. */
export const LATEST_JSON_URL = `${RELEASES_LATEST}/latest.json`;
/** Nombre del APK y del instalador que adjunta la publicación. */
export const APK_ASSET = "Nido.apk";
export const WINDOWS_ASSET = "Nido-setup.exe";
/** URL del APK que descarga Android (mismo nombre en cada release). */
export const APK_URL = `${RELEASES_LATEST}/${APK_ASSET}`;
/** `version.json` publicado en GitHub Pages (respaldo si la release no se puede leer). */
export const PUBLISHED_VERSION_URL =
  "https://enriquexv17-del.github.io/nido/version.json";

/** Compara «1.2.3»: devuelve > 0 si `a` es más nueva que `b`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** Lo que se muestra en la pantalla de Actualizaciones. */
export interface LatestInfo {
  version: string;
  notes: string[];
}

/** Convierte «notas» (texto o lista) en una lista limpia. */
export function normalizeNotes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((n) => String(n).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((n) => n.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

/** Valida una respuesta con forma `{ version, notes? }`. Lanza si no sirve. */
export function parseLatest(raw: unknown): LatestInfo {
  if (!raw || typeof raw !== "object") throw new Error("respuesta inválida");
  const data = raw as { version?: unknown; notes?: unknown; body?: unknown };
  if (typeof data.version !== "string" || !data.version) throw new Error("sin versión");
  const notes = normalizeNotes(data.notes ?? data.body);
  return { version: data.version, notes };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`respuesta ${res.status}`);
  return (await res.json()) as unknown;
}

/**
 * Última versión publicada.
 *
 * Web: `version.json` del propio sitio (misma ruta que usa el service worker).
 * Android: `latest.json` de la release; si falla, el `version.json` publicado.
 * Desktop: no se usa (Electron consulta la release por su cuenta).
 */
export async function fetchLatest(platform: Platform = getPlatform()): Promise<LatestInfo> {
  if (platform === "android") {
    try {
      return parseLatest(await fetchJson(LATEST_JSON_URL));
    } catch {
      return parseLatest(await fetchJson(PUBLISHED_VERSION_URL));
    }
  }
  return parseLatest(await fetchJson("version.json"));
}

/** Versión instalada de verdad, según la plataforma. */
export async function getInstalledVersion(
  platform: Platform = getPlatform()
): Promise<string> {
  if (platform === "android") {
    try {
      const { App } = await import("@capacitor/app");
      const info = await App.getInfo();
      if (info?.version) return info.version;
    } catch {
      /* sin plugin: cae a la versión compilada */
    }
  }
  if (platform === "desktop") {
    const bridge = nidoBridge();
    if (bridge?.appVersion) {
      try {
        const version = await bridge.appVersion();
        if (version) return version;
      } catch {
        /* sin puente: cae a la versión compilada */
      }
    }
  }
  return APP_VERSION;
}

/** Abre una URL en el navegador del sistema (Electron/Android) o en una pestaña nueva. */
export async function openDownload(url: string): Promise<void> {
  const bridge = nidoBridge();
  if (bridge?.openExternal) {
    try {
      await bridge.openExternal(url);
      return;
    } catch {
      /* sin puente de Electron: cae al resto */
    }
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
    return;
  } catch {
    /* sin plugin de navegador */
  }
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener");
}

/* ------------------------------ Windows (Electron) ----------------------------- */

export interface DesktopUpdate {
  currentVersion: string;
  version: string;
  notes: string[];
  /** Descarga el paquete y avisa el progreso 0-100 si el servidor da el tamaño. */
  download: (onProgress?: (percent: number) => void) => Promise<void>;
  /** Instala lo descargado; en Windows cierra la app y la vuelve a abrir. */
  install: () => Promise<void>;
}

/** Comprueba si hay una versión nueva. `null` = estás al día (o sin updater). */
export async function checkDesktopUpdate(): Promise<DesktopUpdate | null> {
  const bridge = nidoBridge();
  if (!bridge?.checkForUpdates) return null;

  const found = await bridge.checkForUpdates();
  if (!found) return null;

  const currentVersion = await getInstalledVersion("desktop");
  return {
    currentVersion,
    version: found.version,
    notes: normalizeNotes(found.notes),
    download: async (onProgress) => {
      if (!onProgress || !bridge.onUpdateProgress) {
        await bridge.downloadUpdate?.();
        return;
      }
      const off = bridge.onUpdateProgress(onProgress);
      try {
        await bridge.downloadUpdate?.();
      } finally {
        off();
      }
    },
    install: async () => {
      await bridge.installUpdate?.();
    }
  };
}

/** Reinicia la app ya instalada (Windows). */
export async function relaunchApp(): Promise<void> {
  await nidoBridge()?.relaunch?.();
}
