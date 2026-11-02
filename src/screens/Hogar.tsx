import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EntryScreen } from "../layout/EntryShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { COLOR_CHOICES } from "../data";

export function Hogar() {
  const navigate = useNavigate();
  const [home, setHome] = useState("Nuestro depa");
  const [color, setColor] = useState<string>("--p1");

  return (
    <EntryScreen
      step={2}
      title="Dale nombre a tu hogar"
      subtitle="Lo verán todas las personas que se unan."
      footer={
        <Button block onClick={() => navigate("/invitar")}>
          Crear hogar
        </Button>
      }
    >
      <Field label="Nombre del hogar" value={home} onChange={setHome} />

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
