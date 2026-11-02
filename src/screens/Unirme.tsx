import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EntryShell } from "../layout/EntryShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Icon, Logo } from "../components/Icon";
import { COLOR_CHOICES, previewHousehold, useAuth, useHouseholdSetup } from "../data";

function joinError(message: string): string {
  if (message.includes("HOGAR_LLENO")) return "Ese hogar ya tiene 3 personas.";
  if (message.includes("CODIGO_INVALIDO")) return "Ese código no existe. Revísalo.";
  if (message.includes("SIN_SESION")) return "Inicia sesión para unirte.";
  return "No pudimos unirte. Intenta de nuevo.";
}

export function Unirme() {
  const navigate = useNavigate();
  const { signUpName, user, signIn, isDemo } = useAuth();
  const { joinHousehold, isSaving } = useHouseholdSetup();
  const [code, setCode] = useState("");
  const [name, setName] = useState(signUpName || "Joaquín");
  const [color, setColor] = useState<string>("--p2");
  const [preview, setPreview] = useState<{ name: string; count: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = code.trim();
    if (value.length < 4) {
      setPreview(null);
      setChecking(false);
      return;
    }
    let active = true;
    setChecking(true);
    const t = window.setTimeout(async () => {
      const found = await previewHousehold(value);
      if (!active) return;
      setPreview(found);
      setChecking(false);
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [code]);

  async function onJoin() {
    setError(null);
    if (!preview) {
      setError("Revisa el código del hogar.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Escribe tu nombre.");
      return;
    }
    try {
      await joinHousehold({ code: code.trim(), memberName: name.trim(), color });
      if (isDemo && !user) await signIn("", "");
      navigate("/inicio");
    } catch (e) {
      setError(joinError(e instanceof Error ? e.message : ""));
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
          <h1 className="screen-title">Unirme a un hogar</h1>
          <p className="screen-sub">Escribe el código que te compartieron.</p>
        </header>

        <div className="entry-body">
          <Field label="Código" value={code} onChange={setCode} autoCapitalize="characters" />

          {preview ? (
            <div className="join-card">
              <Logo size={40} />
              <div className="join-card-text">
                <span className="join-card-name">{preview.name}</span>
                <span className="join-card-sub">
                  {preview.count} de 3 · {Math.max(0, 3 - preview.count)} lugar(es) libre(s)
                </span>
              </div>
            </div>
          ) : (
            <p className="join-hint">
              {checking ? "Buscando el hogar…" : "Escribe el código para ver el hogar."}
            </p>
          )}

          <Field label="Tu nombre" value={name} onChange={setName} autoComplete="name" />

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <div className="form-block">
            <span className="form-label">Tu color en la app</span>
            <div className="color-row">
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-dot${c === color ? " is-active" : ""}`}
                  style={{ background: `var(${c})` }}
                  onClick={() => setColor(c)}
                  aria-label="Elegir color"
                  aria-pressed={c === color}
                >
                  {c === color ? <Icon name="check" size={16} /> : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="entry-footer">
          <Button block onClick={onJoin} disabled={isSaving || !preview}>
            {isSaving ? "Uniéndome…" : "Unirme al hogar"}
          </Button>
        </div>
      </div>
    </EntryShell>
  );
}
