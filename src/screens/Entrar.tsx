import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EntryShell } from "../layout/EntryShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { authError } from "../lib/authErrors";
import { useAuth } from "../data";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Iniciar sesión con una cuenta existente. Si ya hay sesión, sale de aquí.
 * En modo demostración acepta cualquier correo y contraseña.
 */
export function Entrar() {
  const navigate = useNavigate();
  const { signIn, isDemo, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // En modo real, si ya hay sesión no tiene sentido quedarse aquí. En el
    // modo demostración la sesión viene abierta por defecto, así que dejamos
    // la pantalla visible para poder probarla.
    if (!isDemo && !loading && user) navigate("/inicio", { replace: true });
  }, [isDemo, loading, user, navigate]);

  async function onEnter() {
    setError(null);
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
      await signIn(email.trim(), password);
      navigate("/inicio", { replace: true });
    } catch (e) {
      setError(authError(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EntryShell>
      <div className="entry-screen">
        <header className="entry-head">
          <button
            type="button"
            className="back-btn"
            aria-label="Volver"
            onClick={() => navigate("/bienvenida")}
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <h1 className="screen-title">Inicia sesión</h1>
          <p className="screen-sub">
            {isDemo
              ? "En modo demostración puedes entrar con cualquier correo."
              : "Entra con el correo con el que creaste tu cuenta."}
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
          <Field
            label="Contraseña"
            value={password}
            onChange={setPassword}
            type="password"
            autoComplete="current-password"
          />

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <Link className="entry-link" to="/recuperar">
            Olvidé mi contraseña
          </Link>
        </div>

        <div className="entry-footer">
          <Button block onClick={onEnter} disabled={busy}>
            {busy ? "Entrando..." : "Entrar"}
          </Button>
          <p className="entry-alt">
            ¿Aún no tienes cuenta? <Link to="/cuenta">Crear una</Link>
          </p>
        </div>
      </div>
    </EntryShell>
  );
}
