import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { AnimatePresence, DUR, m, SPRING_UI } from "../motion";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Diálogo centrado. El fondo entra con un fundido y la tarjeta con una escala
 * suave (0.94 → 1). Solo se animan `transform` y `opacity`.
 */
export function Dialog({ open, onClose, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          key="overlay"
          className="overlay overlay--center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.normal }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <m.div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
            transition={SPRING_UI}
          >
            {children}
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ConfirmDelete({
  open,
  name,
  onClose,
  onConfirm
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onConfirm?: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <span className="dialog-icon shake">
        <Icon name="trash" size={22} />
      </span>
      <h2 className="dialog-title">¿Eliminar «{name}»?</h2>
      <p className="dialog-text">
        Se quitará para los 3 integrantes y el reparto se recalcula al instante.
      </p>
      <div className="dialog-actions">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="coral" onClick={onConfirm ?? onClose}>
          Eliminar
        </Button>
      </div>
    </Dialog>
  );
}
