import { getPlatform } from "./platform";

/**
 * Esquema propio de la app de Android (Capacitor). Supabase debe tenerlo en
 * *Authentication → URL Configuration → Redirect URLs* como `com.nido.app://auth`.
 */
export const ANDROID_AUTH_SCHEME = "com.nido.app";

/**
 * URL pública de la app respetando la base de Vite (`VITE_BASE`).
 *
 * En GitHub Pages la app vive en `/nombre-del-repo/`; en local en `/`.
 * Se usa para los redirects de OAuth y de recuperación de contraseña, que
 * Supabase debe devolver a la misma ruta base.
 */
export function publicBaseUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  return new URL(base, `${window.location.origin}/`).toString();
}

/**
 * A dónde debe volver Supabase tras el login con Google.
 *
 * - **Android:** al esquema propio (`com.nido.app://auth`), que la app captura
 *   con `App.addListener("appUrlOpen")`.
 * - **web/PWA:** a la base pública de siempre.
 * - **desktop (Tauri):** igual que web (en esta versión no hay deep link).
 */
export function oauthRedirectUrl(): string {
  if (getPlatform() === "android") return `${ANDROID_AUTH_SCHEME}://auth`;
  return publicBaseUrl();
}

/** URL a la que Supabase vuelve después del correo de recuperación. */
export function recoveryRedirectUrl(): string {
  const url = new URL(publicBaseUrl());
  url.searchParams.set("recuperar", "1");
  return url.toString();
}