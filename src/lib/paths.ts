import { getPlatform } from "./platform";

/**
 * URL de regreso del login con Google en las apps nativas.
 *
 * Debe coincidir exactamente con lo registrado en Supabase
 * (*Authentication → URL Configuration → Redirect URLs*) y con el esquema
 * declarado por Android (`AndroidManifest.xml`) y Electron
 * (`electron-builder.yml`).
 */
export const NATIVE_AUTH_CALLBACK = "nido://login-callback";

/**
 * URL pública de la app respetando la base de Vite (`VITE_BASE`).
 *
 * En GitHub Pages la app vive en `/nombre-del-repo/`; en local en `/`.
 * Se usa para el regreso del OAuth en web/PWA, que Supabase debe devolver a
 * la misma ruta base.
 */
export function publicBaseUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  return new URL(base, `${window.location.origin}/`).toString();
}

/**
 * A dónde debe volver Supabase tras el login con Google.
 *
 * - **Android (Capacitor) y desktop (Electron):** al esquema propio
 *   `nido://login-callback`, que la app captura y canjea por una sesión.
 * - **web/PWA:** a la base pública (`https://.../nido/`).
 */
export function oauthRedirectUrl(): string {
  const platform = getPlatform();
  if (platform === "android" || platform === "desktop") return NATIVE_AUTH_CALLBACK;
  return publicBaseUrl();
}