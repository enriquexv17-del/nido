import { BackHeader } from "../components/ScreenHeader";
import { Button } from "../components/Button";
import { Logo } from "../components/Icon";

export function Actualizaciones() {
  return (
    <div className="screen">
      <BackHeader over="Nido para Android" title="Actualizaciones" />

      <div className="card update-card">
        <div className="update-head">
          <Logo size={46} />
          <div className="update-head-text">
            <span className="update-title">Nido 1.1.0</span>
            <span className="update-sub">Nueva versión disponible</span>
          </div>
        </div>

        <span className="update-news-label">Novedades</span>
        <ul className="update-news">
          <li>Gastos con ícono propio</li>
          <li>Reparto más rápido</li>
        </ul>

        <div className="progress">
          <span style={{ width: "64%" }} />
        </div>
        <div className="progress-foot">
          <span>Descargando…</span>
          <strong>64%</strong>
        </div>
      </div>

      <div className="card update-info">
        <div className="info-row">
          <span>Versión instalada</span>
          <strong>1.0.0</strong>
        </div>
        <div className="info-row">
          <span>Última revisión</span>
          <strong>hoy, 9:38</strong>
        </div>
      </div>

      <Button block onClick={() => undefined}>
        Instalar cuando termine
      </Button>

      <p className="help-text">La app te avisa sola cada vez que sale una versión.</p>
    </div>
  );
}
