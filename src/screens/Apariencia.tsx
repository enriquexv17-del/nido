import { BackHeader } from "../components/ScreenHeader";
import { Segmented } from "../components/Segmented";
import { Icon } from "../components/Icon";
import { useTheme, ACCENTS, THEME_MODES, type AccentId } from "../lib/theme";

export function Apariencia() {
  const { mode, accent, resolved, setMode, setAccent } = useTheme();

  return (
    <div className="screen home-stagger">
      <BackHeader over="Ajustes" title="Apariencia" />

      <p className="note note--blue">
        Es una preferencia de este dispositivo: se queda guardada aquí y no cambia la de
        los demás integrantes.
      </p>

      <section className="card ape-block">
        <h2 className="ape-title">Modo</h2>
        <Segmented value={mode} onChange={setMode} options={THEME_MODES} />
        <p className="help-text">
          {mode === "auto"
            ? `Automático · ahora en ${resolved === "dark" ? "oscuro" : "claro"}.`
            : mode === "dark"
              ? "Oscuro siempre."
              : "Claro siempre."}
        </p>
      </section>

      <section className="card ape-block">
        <h2 className="ape-title">Color de acento</h2>
        <div className="accent-grid" role="radiogroup" aria-label="Color de acento">
          {ACCENTS.map((a) => {
            const active = accent === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={a.label}
                className={`accent-swatch${active ? " is-active" : ""}`}
                onClick={() => setAccent(a.id as AccentId)}
              >
                <span className="accent-dot" style={{ background: a.color }}>
                  {active ? <Icon name="check" size={15} /> : null}
                </span>
                <span className="accent-name">{a.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="ape-preview">
        <span className="ape-preview-pill">Ejemplo de acento</span>
        <span className="help-text">Así se ven los botones y resaltados.</span>
      </div>
    </div>
  );
}
