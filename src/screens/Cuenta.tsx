import { useEffect, useState } from "react";
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
  const { signUp, verifySignupOtp, resendSignupOtp, signInWithGoogle, setSignUpName, isDemo } =
    useAuth();
  const [name, setName] = useState("Enrique");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [step, setStep] = useState<"datos" | "codigo">("datos");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  /** Cuenta atrás para no saturar el reenvío de códigos. */
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

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
      // Si Supabase exige confirmar el correo, todavía no hay sesión: pasamos
      // al código de 6 dígitos (no dependemos del enlace del correo).
      if (result.needsConfirmation) {
        setOtp("");
        setResendIn(30);
        setStep("codigo");
        return;
      }
      // En modo demostración se conserva el flujo de crear el hogar; con
      // Supabase la app decide en inicio si crear o unirse con un código.
      navigate(isDemo ? "/hogar" : "/inicio");
    } catch (e) {
      setError(authError(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setError(null);
    const token = otp.trim();
    if (token.length !== 6) {
      setError("Escribe los 6 dígitos que enviamos a tu correo.");
      return;
    }
    setBusy(true);
    try {
      await verifySignupOtp(email.trim(), token);
      navigate("/inicio", { replace: true });
    } catch (e) {
      setError(authError(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setError(null);
    setResending(true);
    try {
      await resendSignupOtp(email.trim());
      setOtp("");
      setResendIn(30);
      setToast("Te enviamos un código nuevo");
    } catch (e) {
      setError(authError(e instanceof Error ? e.message : ""));
    } finally {
      setResending(false);
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

  if (step === "codigo") {
    return (
      <EntryShell>
        <div className="entry-screen">
          <header className="entry-head">
            <button
              type="button"
              className="back-btn"
              aria-label="Volver"
              onClick={() => {
                setError(null);
                setOtp("");
                setStep("datos");
              }}
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <h1 className="screen-title">Confirma tu correo</h1>
            <p className="screen-sub">
              Escribe el código de 6 dígitos que enviamos a {email.trim()}.
            </p>
          </header>
          <div className="entry-body">
            <Field
              label="Código de 6 dígitos"
              value={otp}
              onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              aria-invalid={error ? true : undefined}
            />

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            <p className="join-hint">
              Revisa también la carpeta de spam. El código vence en pocos minutos.
            </p>
          </div>
          <div className="entry-footer">
            <Button block onClick={onVerify} disabled={busy || otp.length !== 6}>
              {busy ? "Confirmando..." : "Confirmar código"}
            </Button>
            <Button
              variant="ghost"
              block
              onClick={onResend}
              disabled={resending || resendIn > 0}
            >
              {resending
                ? "Reenviando..."
                : resendIn > 0
                  ? `Reenviar código (${resendIn}s)`
                  : "Reenviar código"}
            </Button>
            <p className="entry-alt">
              ¿Ya confirmaste? <Link to="/entrar">Inicia sesión</Link>
            </p>
          </div>
          {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
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
