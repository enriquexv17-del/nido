/**
 * Traduce los errores de autenticación de Supabase a algo claro en español.
 * Se usa en las pantallas de entrada (crear cuenta, iniciar sesión, recuperar).
 */
export function authError(message: string): string {
  const m = message.toLowerCase();
  if (message.includes("GOOGLE_SOLO_WEB") || message.includes("GOOGLE_NATIVO"))
    return "Usa correo y contraseña en esta versión.";
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "Correo o contraseña incorrectos.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ese correo ya tiene una cuenta. Inicia sesión.";
  if (m.includes("email not confirmed"))
    return "Confirma tu correo antes de entrar. Revisa tu bandeja.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  if (m.includes("password"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("session") || m.includes("token"))
    return "El enlace venció. Pide uno nuevo.";
  if (m.includes("email")) return "Escribe un correo válido.";
  return "No pudimos completar la acción. Intenta de nuevo.";
}
