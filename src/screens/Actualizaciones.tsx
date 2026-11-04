import { useEffect, useState } from "react";
import { BackHeader } from "../components/ScreenHeader";
import { Button } from "../components/Button";
import { Logo } from "../components/Icon";
import { useReducedMotion } from "../motion";
import { useAppUpdate } from "../lib/useAppUpdate";

/** Duración de la descarga simulada del service worker (solo web). */
const DOWNLOAD_MS = 2600;

/**
 * Actualizaciones. Mismo diseño para las tres plataformas:
 *
 * - **web/PWA:** compara con `version.json` y recarga con el service worker nuevo.
 * - **Android:** lee la última release y ofrece abrir la descarga del APK, que
 *   se instala a mano.
 * - **Windows:** el actualizador de Electron descarga y luego instala y reinicia.
 */
export function Actualizaciones() {
  const {
    installed,
    latest,
    notes,
    hasUpdate,
    pending,
    checking,
    checkedAt,
    platform,
    progress: realProgress,
    applying,
    hint,
    error,
    run,
    check
  } = useAppUpdate();
  const reduced = useReducedMotion();
  const [simulated, setSimulated] = useState(0);

  // La barra de progreso solo se simula en web (la descarga real la hace el
  // service worker). En Windows la reporta el actualizador; en Android no hay
  // descarga dentro de la app.
  useEffect(() => {
    if (platform !== "web") return;
    if (!hasUpdate) {
      setSimulated(0);
      return;
    }
    if (pending || reduced) {
      setSimulated(100);
      return;
    }
    let elapsed = 0;
    setSimulated(0);
    const id = window.setInterval(() => {
      elapsed += 120;
      const p = Math.min(100, Math.round((elapsed / DOWNLOAD_MS) * 100));
      setSimulated(p);
      if (p >= 100) window.clearInterval(id);
    }, 120);
    return () => window.clearInterval(id);
  }, [platform, hasUpdate, pending, reduced, latest]);

  const progress = platform === "web" ? simulated : realProgress ?? 0;
  const showProgress = hasUpdate && platform !== "android";
  const ready = hasUpdate && (platform === "android" || progress >= 100);
  const firstLoad = checking && !checkedAt;

  const sub = error
    ? "No se pudo comprobar"
    : !checkedAt
      ? "Comprobando..."
      : hasUpdate
        ? "Nueva versión disponible"
        : "Estás en la última versión";

  const timeLabel = checkedAt
    ? `hoy, ${checkedAt.getHours()}:${String(checkedAt.getMinutes()).padStart(2, "0")}`
    : "—";

  const label = firstLoad
    ? "Comprobando..."
    : hasUpdate
      ? platform === "android"
        ? applying
          ? "Abriendo..."
          : "Abrir descarga"
        : ready
          ? applying
            ? "Instalando..."
            : "Instalar y reiniciar"
          : "Instalar cuando termine"
      : "Buscar actualizaciones";

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

        {showProgress ? (
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
        onClick={hasUpdate ? run : check}
        disabled={firstLoad || (hasUpdate && !ready) || applying}
      >
        {label}
      </Button>

      <p className="help-text">{hint}</p>
    </div>
  );
}
