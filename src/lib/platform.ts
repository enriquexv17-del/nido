/**
 * Detección de plataforma. La misma web corre en tres sitios:
 *
 * - **web**: navegador e iPhone instalado como PWA (`window` normal).
 * - **android**: app de Capacitor (`window.Capacitor.isNativePlatform()`);
 *   Android es el único destino de Capacitor en este proyecto.
 * - **desktop**: app de Tauri 2 (Windows), que expone `__TAURI_INTERNALS__`.
 *
 * Todo va con guardas de `window` para no romper en SSR, en Vitest (entorno
 * `node`) ni en el primer render.
 */
export type Platform = "web" | "android" | "desktop";

interface CapacitorLike {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

interface NativeWindow {
  Capacitor?: CapacitorLike;
  __TAURI_INTERNALS__?: unknown;
  __TAURI__?: unknown;
}

/** `window` tipado a lo mínimo, o `null` fuera del navegador. */
function nativeWindow(): NativeWindow | null {
  return typeof window === "undefined" ? null : (window as unknown as NativeWindow);
}

/** `true` dentro de Tauri (Windows). En Tauri v2 el marcador es `__TAURI_INTERNALS__`. */
export function isTauri(): boolean {
  const w = nativeWindow();
  if (!w) return false;
  return "__TAURI_INTERNALS__" in w || "__TAURI__" in w;
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
  if (isTauri()) return "desktop";
  if (isCapacitorNative()) return "android";
  return "web";
}

/** `true` cuando la app corre empaquetada (Capacitor o Tauri), no en el navegador. */
export function isNative(): boolean {
  return getPlatform() !== "web";
}
