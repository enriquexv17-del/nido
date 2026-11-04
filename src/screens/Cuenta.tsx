import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EntryScreen, EntryShell } from "../layout/EntryShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Toast } from "../components/Toast";
import { authError } from "../lib/authErrors";
import { getPlatform } from "../lib/platform";
import { useAuth } from "../data";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function Cuenta() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, setSignUpName, isDemo } = useAuth();
  const [name, setName] = useState("Enrique");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);

  async function onContinue() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Escribe tu nombre.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
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
      const result = await signUp(email.trim(), password, name.trim());
      // Si Supabase exige confirmar el correo, todavía no hay sesión.
      if (result.needsConfirmation) {
        setConfirmEmail(true);
        return;
      }
      navigate("/hogar");
    } catch (e) {
      setError(authError(e instanceof Error ? e.message : ""));
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
    if (getPlatform() === "desktop") {
      setToast("Usa correo y contraseña en esta versión.");
      return;
    }
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(authError(e instanceof Error ? e.message : ""));
    }
  }

  if (confirmEmail) {
    return (
      <EntryShell>
        <div className="entry-screen">
          <header className="entry-head">
            <h1 className="screen-title">Revisa tu correo</h1>
            <p className="screen-sub">
              Te enviamos un enlace a {email.trim()} para confirmar tu cuenta.
            </p>
          </header>
          <div className="entry-body">
            <p className="join-hint">
              Cuando la confirmes, vuelve aquí e inicia sesión para crear tu hogar.
            </p>
          </div>
          <div className="entry-footer">
            <Button block onClick={() => navigate("/entrar")}>
              Ir a iniciar sesión
            </Button>
          </div>
        </div>
      </EntryShell>
    );
  }

  return (
    <EntryScreen
      step={1}
      title="Crea tu cuenta"
      subtitle="Así tu hogar te reconoce desde cualquier dispositivo."
      footer={
        <>
          <Button block onClick={onContinue} disabled={busy}>
            {busy ? "Creando..." : "Continuar"}
          </Button>
          <p className="entry-alt">
            ¿Ya tienes cuenta? <Link to="/entrar">Inicia sesión</Link>
          </p>
        </>
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
