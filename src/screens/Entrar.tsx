import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EntryShell } from "../layout/EntryShell";
import { Icon } from "../components/Icon";
import { authError } from "../lib/authErrors";
import { useAuth } from "../data";

/**
 * Pantalla de entrada: solo con Google. Si ya hay sesión (o el regreso del
 * OAuth la creó), sale hacia inicio, que decide entre crear un hogar o unirse
 * con un código.
 */
export function Entrar() {
  const navigate = useNavigate();
  const { signInWithGoogle, isDemo, user, loading, googleError, clearGoogleError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shown = error ?? googleError;

  useEffect(() => {
    // En modo real, si ya hay sesión no tiene sentido quedarse aquí.
    if (!isDemo && !loading && user) navigate("/inicio", { replace: true });
  }, [isDemo, loading, user, navigate]);

  // El error del OAuth nativo se muestra una vez y se limpia al salir.
  useEffect(() => () => clearGoogleError(), [clearGoogleError]);

  async function onGoogle() {
    setError(null);
    clearGoogleError();
    setBusy(true);
    try {
      await signInWithGoogle();
      // En modo demostración la sesión es inmediata: entramos a crear hogar.
      if (isDemo) navigate("/hogar", { replace: true });
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
            Entra con tu cuenta de Google para recuperar tu hogar en cualquier
            dispositivo.
          </p>
        </header>

        <div className="entry-body">
          {shown ? (
            <p className="form-error" role="alert">
              {shown}
            </p>
          ) : null}
        </div>

        <div className="entry-footer">
          <button
            type="button"
            className="btn btn--google btn--block"
            onClick={onGoogle}
            disabled={busy}
          >
            <Icon name="google" size={18} />
            {busy ? "Abriendo Google..." : "Entrar con Google"}
          </button>
        </div>
      </div>
    </EntryShell>
  );
}
