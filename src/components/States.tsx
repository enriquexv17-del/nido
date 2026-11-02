import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { AnimatePresence, m, SPRING_UI } from "../motion";
import { useOnline } from "../lib/useOnline";

/** Esqueleto de carga con el mismo ritmo visual de las tarjetas. */
export function ScreenSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="screen" aria-hidden="true">
      <div className="skeleton skeleton-line" style={{ width: "32%", height: 10 }} />
      <div className="skeleton skeleton-line" style={{ width: "58%", height: 26 }} />
      <div className="skeleton" style={{ height: 82, borderRadius: 18 }} />
      {Array.from({ length: cards }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton skeleton-square" />
          <div className="skeleton-stack">
            <div className="skeleton skeleton-line" style={{ width: "52%" }} />
            <div className="skeleton skeleton-line skeleton-line--sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Estado vacío: no hay datos todavía. */
export function EmptyState({
  title,
  text,
  icon = "wallet",
  actionLabel,
  onAction
}: {
  title: string;
  text: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="card state-card">
      <span className="state-icon">
        <Icon name={icon} size={22} />
      </span>
      <h2 className="state-title">{title}</h2>
      <p className="state-text">{text}</p>
      {actionLabel && onAction ? (
        <Button variant="soft" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

/** Estado de error con reintento. */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="screen">
      <div className="card state-card">
        <span className="state-icon state-icon--coral">
          <Icon name="refresh" size={22} />
        </span>
        <h2 className="state-title">No pudimos cargar tus datos</h2>
        <p className="state-text">Revisa tu conexión e inténtalo de nuevo.</p>
        <Button block onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

/** Aviso discreto cuando el navegador pierde la conexión. */
export function OfflineBanner() {
  const online = useOnline();
  return (
    <AnimatePresence>
      {online ? null : (
        <m.div
          className="offline-banner"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={SPRING_UI}
        >
          <Icon name="wifi" size={13} />
          <span>Sin conexión · mostrando los últimos datos</span>
        </m.div>
      )}
    </AnimatePresence>
  );
}