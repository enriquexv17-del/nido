/**
 * Detección de plataforma. La misma web corre en tres sitios:
 *
 * - **web**: navegador e iPhone instalado como PWA (`window` normal).
 * - **android**: app de Capacitor (`window.Capacitor.isNativePlatform()`);
 *   Android es el único destino de Capacitor en este proyecto.
 * - **desktop**: app de Electron (Windows). El `preload.cjs` expone un puente
 *   propio en `window.nido` con `isElectron: true`.
 *
 * Todo va con guardas de `window` para no romper en SSR, en Vitest (entorno
 * `node`) ni en el primer render.
 */
export type Platform = "web" | "android" | "desktop";

interface CapacitorLike {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

/** Aviso de actualización que entrega el proceso principal de Electron. */
export interface NidoUpdateInfo {
  version: string;
  notes?: string;
}

/**
 * Puente seguro que expone `electron/preload.cjs` (contextIsolation). Solo
 * existen las funciones que la versión de la app implemente: todo es opcional
 * para que la web siga funcionando sin Electron.
 */
export interface NidoBridge {
  isElectron?: boolean;
  appVersion?: () => Promise<string>;
  openExternal?: (url: string) => Promise<void>;
  onAuthCallback?: (callback: (url: string) => void) => () => void;
  checkForUpdates?: () => Promise<NidoUpdateInfo | null>;
  downloadUpdate?: () => Promise<void>;
  installUpdate?: () => Promise<void>;
  onUpdateProgress?: (callback: (percent: number) => void) => () => void;
  relaunch?: () => Promise<void>;
}

interface NativeWindow {
  Capacitor?: CapacitorLike;
  nido?: NidoBridge;
}

/** `window` tipado a lo mínimo, o `null` fuera del navegador. */
function nativeWindow(): NativeWindow | null {
  return typeof window === "undefined" ? null : (window as unknown as NativeWindow);
}

/** Puente de Electron (`window.nido`), o `null` fuera de la app de escritorio. */
export function nidoBridge(): NidoBridge | null {
  const w = nativeWindow();
  const bridge = w?.nido;
  return bridge && typeof bridge === "object" ? bridge : null;
}

/** `true` dentro de la app de Electron (Windows). */
export function isElectron(): boolean {
  return Boolean(nidoBridge()?.isElectron);
}

/** Plataforma de Capacitor: `android`, `ios` o `web` (o `null` si no está). */
export function capacitorPlatform(): string | null {
  const w = nativeWindow();
  const cap = w?.Capacitor;
  if (!cap) return null;
  if (typeof cap.getPlatform === "function") {
    try {
      return cap.getPlatform() ?? null;
    } catch {
      return null;
    }
  }
  // Sin `getPlatform`: si declara ser nativo, asumimos Android.
  return typeof cap.isNativePlatform === "function" && cap.isNativePlatform()
    ? "android"
    : null;
}

/** `true` cuando corre dentro de una app nativa de Capacitor. */
export function isCapacitorNative(): boolean {
  const w = nativeWindow();
  const cap = w?.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === "function") {
    try {
      return cap.isNativePlatform();
    } catch {
      return false;
    }
  }
  return capacitorPlatform() !== null;
}

/** Plataforma efectiva de la app. */
export function getPlatform(): Platform {
  if (typeof window === "undefined") return "web";
  if (isElectron()) return "desktop";
  if (isCapacitorNative()) return "android";
  return "web";
}

/** `true` cuando la app corre empaquetada (Capacitor o Electron), no en el navegador. */
export function isNative(): boolean {
  return getPlatform() !== "web";
}
