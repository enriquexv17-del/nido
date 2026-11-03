import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EntryShell } from "../layout/EntryShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Toast } from "../components/Toast";
import { authError } from "../lib/authErrors";
import { useAuth } from "../data";

/**
 * Pantalla a la que vuelve el enlace de recuperación
 * (`.../?recuperar=1#/restablecer`). Aquí se define la contraseña nueva.
 */
export function Restablecer() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setToast("Contraseña actualizada");
      window.setTimeout(() => navigate("/inicio", { replace: true }), 700);
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
          <h1 className="screen-title">Nueva contraseña</h1>
          <p className="screen-sub">Elige una contraseña nueva para tu cuenta.</p>
        </header>

        <div className="entry-body">
          <Field
            label="Contraseña nueva"
            value={password}
            onChange={setPassword}
            type="password"
            autoComplete="new-password"
          />
          <Field
            label="Repite la contraseña"
            value={confirm}
            onChange={setConfirm}
            type="password"
            autoComplete="new-password"
          />

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="entry-footer">
          <Button block onClick={onSave} disabled={busy}>
            {busy ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </div>

        {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
      </div>
    </EntryShell>
  );
}
