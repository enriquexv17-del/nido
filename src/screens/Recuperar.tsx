import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EntryShell } from "../layout/EntryShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { authError } from "../lib/authErrors";
import { useAuth } from "../data";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Pedir el enlace para recuperar la contraseña. */
export function Recuperar() {
  const navigate = useNavigate();
  const { sendPasswordReset, isDemo } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSend() {
    setError(null);
    if (!EMAIL_RE.test(email)) {
      setError("Escribe un correo válido.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError(authError(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <EntryShell>
        <div className="entry-screen">
          <header className="entry-head">
            <h1 className="screen-title">Revisa tu correo</h1>
            <p className="screen-sub">
              Si {email.trim()} tiene una cuenta, te enviamos un enlace para
              crear una contraseña nueva.
            </p>
          </header>
          <div className="entry-body">
            <p className="join-hint">
              {isDemo
                ? "En modo demostración no se envía correo. Con Supabase conectado sí llegará."
                : "El enlace vence en pocos minutos. Revisa también la carpeta de spam."}
            </p>
          </div>
          <div className="entry-footer">
            <Button block onClick={() => navigate("/entrar")}>
              Volver a iniciar sesión
            </Button>
          </div>
        </div>
      </EntryShell>
    );
  }

  return (
    <EntryShell>
      <div className="entry-screen">
        <header className="entry-head">
          <button
            type="button"
            className="back-btn"
            aria-label="Volver"
            onClick={() => navigate("/entrar")}
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <h1 className="screen-title">Recuperar contraseña</h1>
          <p className="screen-sub">
            Escribe tu correo y te enviaremos un enlace para cambiarla.
          </p>
        </header>

        <div className="entry-body">
          <Field
            label="Correo"
            value={email}
            onChange={setEmail}
            type="email"
            inputMode="email"
            autoComplete="email"
          />

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="entry-footer">
          <Button block onClick={onSend} disabled={busy}>
            {busy ? "Enviando..." : "Enviar enlace"}
          </Button>
          <p className="entry-alt">
            ¿La recordaste? <Link to="/entrar">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </EntryShell>
  );
}
