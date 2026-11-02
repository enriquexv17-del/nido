import { BackHeader } from "../components/ScreenHeader";

const CARDS = [
  {
    title: "AFP · pensión",
    pill: "7.25%",
    tone: "jade",
    text: "Se descuenta del sueldo bruto. Sirve para tu pensión."
  },
  {
    title: "ISSS · seguro social",
    pill: "3%",
    tone: "jade",
    text: "Máximo $30 al mes (se calcula hasta $1,000 de sueldo)."
  },
  {
    title: "Renta (ISR)",
    pill: "Apagada",
    tone: "muted",
    text: "Solo aplica si tu sueldo, ya sin AFP e ISSS, pasa de $550 al mes."
  }
];

export function Descuentos() {
  return (
    <div className="screen">
      <BackHeader over="El Salvador" title="Descuentos de ley" />

      <p className="note note--blue">
        Cada persona activa o apaga estos descuentos en su propio sueldo. Aquí solo cambias
        los porcentajes si la ley cambia.
      </p>

      <div className="law-list">
        {CARDS.map((c) => (
          <article className="card law-card" key={c.title}>
            <div className="law-head">
              <span className="law-title">{c.title}</span>
              <span className={`law-pill law-pill--${c.tone}`}>{c.pill}</span>
            </div>
            <p className="law-text">{c.text}</p>
          </article>
        ))}
      </div>

      <p className="help-text">Valores de referencia 2026. Edítalos si tu trabajo cobra distinto.</p>
    </div>
  );
}
