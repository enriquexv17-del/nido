import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EntryScreen } from "../layout/EntryShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Toast } from "../components/Toast";
import { useAuth } from "../data";

/** Traduce los errores de Supabase a algo claro en español. */
function cuentaError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ese correo ya tiene una cuenta. Inicia sesión.";
  if (m.includes("password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("email")) return "Escribe un correo válido.";
  return "No pudimos crear tu cuenta. Intenta de nuevo.";
}

export function Cuenta() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, setSignUpName, isDemo } = useAuth();
  const [name, setName] = useState("Enrique");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function onContinue() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Escribe tu nombre.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Escribe un correo válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      setSignUpName(name.trim());
      await signUp(email.trim(), password, name.trim());
      navigate("/hogar");
    } catch (e) {
      setError(cuentaError(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    if (isDemo) {
      setToast("Disponible al conectar Supabase");
      return;
    }
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(cuentaError(e instanceof Error ? e.message : ""));
    }
  }

  return (
    <EntryScreen
      step={1}
      title="Crea tu cuenta"
      subtitle="Así tu hogar te reconoce desde cualquier dispositivo."
      footer={
        <Button block onClick={onContinue} disabled={busy}>
          {busy ? "Creando…" : "Continuar"}
        </Button>
      }
    >
      <Field label="Tu nombre" value={name} onChange={setName} autoComplete="name" />
      <Field
        label="Correo"
        value={email}
        onChange={setEmail}
        type="email"
        inputMode="email"
        autoComplete="email"
        aria-invalid={error ? true : undefined}
      />
      <Field
        label="Contraseña"
        value={password}
        onChange={setPassword}
        type="password"
        autoComplete="new-password"
        aria-invalid={error ? true : undefined}
      />

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="divider">
        <span>o</span>
      </div>

      <button type="button" className="btn btn--google btn--block" onClick={onGoogle}>
        <Icon name="google" size={18} />
        Continuar con Google
      </button>

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </EntryScreen>
  );
}
