import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EntryShell } from "../layout/EntryShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Icon";
import { COLOR_CHOICES } from "../data/mock";

export function Unirme() {
  const navigate = useNavigate();
  const [code, setCode] = useState("NIDO-7K4Q");
  const [name, setName] = useState("Joaquín");
  const [color, setColor] = useState<string>("--p2");

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
          <Field label="Código" value={code} onChange={setCode} />

          <div className="join-card">
            <Logo size={40} />
            <div className="join-card-text">
              <span className="join-card-name">Nuestro depa</span>
              <span className="join-card-sub">Creado por Enrique · 1 de 3</span>
            </div>
          </div>

          <Field label="Tu nombre" value={name} onChange={setName} />

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
          <Button block onClick={() => navigate("/inicio")}>
            Unirme al hogar
          </Button>
        </div>
      </div>
    </EntryShell>
  );
}
