import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { EntryScreen } from "../layout/EntryShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { COLOR_CHOICES, useAuth, useHouseholdSetup } from "../data";

export function Hogar() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { createHousehold, isSaving } = useHouseholdSetup();
  const [home, setHome] = useState("Nuestro depa");
  const [color, setColor] = useState<string>("--p1");
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setError(null);
    if (home.trim().length < 2) {
      setError("Escribe un nombre para tu hogar.");
      return;
    }
    try {
      await createHousehold({
        name: home.trim(),
        memberName: (user?.name || "Yo").trim(),
        color
      });
      navigate("/invitar");
    } catch {
      setError("No pudimos crear el hogar. Intenta de nuevo.");
    }
  }

  if (loading) return <div className="route-loading" aria-hidden="true" />;
  if (!user) return <Navigate to="/entrar" replace />;

  return (
    <EntryScreen
      step={2}
      title="Dale nombre a tu hogar"
      subtitle="Lo verán todas las personas que se unan."
      footer={
        <Button block onClick={onCreate} disabled={isSaving}>
          {isSaving ? "Creando..." : "Crear hogar"}
        </Button>
      }
    >
      <Field label="Nombre del hogar" value={home} onChange={setHome} />

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

      <div className="currency-row">
        <span className="currency-icon">
          <Icon name="dollar" size={15} />
        </span>
        <div className="currency-text">
          <span className="currency-title">Moneda</span>
          <span className="currency-sub">Dólar estadounidense (US$)</span>
        </div>
      </div>
    </EntryScreen>
  );
}
