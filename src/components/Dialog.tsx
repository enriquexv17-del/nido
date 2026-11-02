import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ open, onClose, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="overlay overlay--center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog" role="alertdialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export function ConfirmDelete({
  open,
  name,
  onClose
}: {
  open: boolean;
  name: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <span className="dialog-icon">
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
        <Button variant="coral" onClick={onClose}>
          Eliminar
        </Button>
      </div>
    </Dialog>
  );
}
