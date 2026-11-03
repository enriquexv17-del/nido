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

/** URL a la que Supabase vuelve después del correo de recuperación. */
export function recoveryRedirectUrl(): string {
  const url = new URL(publicBaseUrl());
  url.searchParams.set("recuperar", "1");
  return url.toString();
}