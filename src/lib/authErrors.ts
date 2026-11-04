/**
 * Traduce los errores del inicio de sesión con Google a algo claro en español.
 * Lo usan la bienvenida, la pantalla de entrada y el regreso del OAuth nativo.
 */
export function authError(message: string): string {
  const m = message.toLowerCase();
  if (message.includes("GOOGLE_SIN_URL"))
    return "No pudimos abrir la ventana de Google. Inténtalo de nuevo.";
  if (m.includes("redirect_uri_mismatch") || m.includes("redirect uri"))
    return "La dirección de regreso no está permitida. Avisa a quien administra la app.";
  if (m.includes("access_denied") || m.includes("cancel") || m.includes("denied"))
    return "Cancelaste el acceso con Google. Puedes intentarlo de nuevo.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("fetch"))
    return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  if (m.includes("provider") || m.includes("oauth") || m.includes("google"))
    return "No pudimos entrar con Google. Inténtalo de nuevo.";
  return "No pudimos completar la acción. Inténtalo de nuevo.";
}
