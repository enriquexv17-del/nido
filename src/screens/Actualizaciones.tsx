import { useEffect, useState } from "react";
import { BackHeader } from "../components/ScreenHeader";
import { Button } from "../components/Button";
import { Logo } from "../components/Icon";
import { useReducedMotion } from "../motion";
import { useAppUpdate } from "../lib/useAppUpdate";
import { applyUpdate } from "../lib/pwa";

/** Duración de la descarga simulada (aún no hay APK que descargar). */
const DOWNLOAD_MS = 2600;

/**
 * Actualizaciones. La versión instalada sale de `package.json` y la publicada
 * de `version.json`; si hay una nueva, la barra avanza sola (descarga
 * simulada) y el botón instala la PWA (recarga con el service worker nuevo).
 */
export function Actualizaciones() {
  const { installed, latest, notes, hasUpdate, checking, checkedAt, check } = useAppUpdate();
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!hasUpdate) {
      setProgress(0);
      return;
    }
    if (reduced) {
      setProgress(100);
      return;
    }
    let elapsed = 0;
    setProgress(0);
    const id = window.setInterval(() => {
      elapsed += 120;
      const p = Math.min(100, Math.round((elapsed / DOWNLOAD_MS) * 100));
      setProgress(p);
      if (p >= 100) window.clearInterval(id);
    }, 120);
    return () => window.clearInterval(id);
  }, [hasUpdate, reduced, latest]);

  const ready = hasUpdate && progress >= 100;
  const firstLoad = checking && !checkedAt;

  const sub = !checkedAt
    ? "Comprobando..."
    : hasUpdate
      ? "Nueva versión disponible"
      : "Estás en la última versión";

  const timeLabel = checkedAt
    ? `hoy, ${checkedAt.getHours()}:${String(checkedAt.getMinutes()).padStart(2, "0")}`
    : "—";

  async function onInstall() {
    if (!ready) return;
    setApplying(true);
    await applyUpdate();
  }

  return (
    <div className="screen home-stagger">
      <BackHeader over="Nido para Android" title="Actualizaciones" />

      <div className="card update-card">
        <div className="update-head">
          <Logo size={46} />
          <div className="update-head-text">
            <span className="update-title">Nido {latest}</span>
            <span className="update-sub">{sub}</span>
          </div>
        </div>

        {notes.length > 0 ? (
          <>
            <span className="update-news-label">Novedades</span>
            <ul className="update-news">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </>
        ) : null}

        {hasUpdate ? (
          <>
            <div className="progress">
              <span style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
            <div className="progress-foot">
              <span>{ready ? "Listo para instalar" : "Descargando..."}</span>
              <strong>{progress}%</strong>
            </div>
          </>
        ) : null}
      </div>

      <div className="card update-info">
        <div className="info-row">
          <span>Versión instalada</span>
          <strong>{installed}</strong>
        </div>
        <div className="info-row">
          <span>Última revisión</span>
          <strong>{timeLabel}</strong>
        </div>
      </div>

      <Button
        block
        onClick={hasUpdate ? onInstall : check}
        disabled={firstLoad || (hasUpdate && !ready)}
      >
        {firstLoad
          ? "Comprobando..."
          : hasUpdate
            ? ready
              ? applying
                ? "Instalando..."
                : "Instalar y reiniciar"
              : "Instalar cuando termine"
            : "Buscar actualizaciones"}
      </Button>

      <p className="help-text">La app te avisa sola cada vez que sale una versión.</p>
    </div>
  );
}
