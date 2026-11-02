import { useState } from "react";
import { BackHeader } from "../components/ScreenHeader";
import { Button, IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import { Sheet } from "../components/Sheet";
import { Dialog } from "../components/Dialog";
import { Field } from "../components/Field";
import { Toast } from "../components/Toast";
import { CountUp } from "../components/CountUp";
import { EmptyState, ErrorState, ScreenSkeleton } from "../components/States";
import { formatUSD } from "../lib/format";
import { monthLabel } from "../lib/month";
import {
  useDataStatus,
  useMonth,
  useOtherIncomeActions,
  useOtherIncomes,
  useRefresh,
  type RawOtherIncome
} from "../data";

/**
 * Otros ingresos (Fase 3). Ingresos extra **personales** (marca de ropa,
 * edición de video, trabajos aparte). No entran al reparto del hogar.
 */
export function OtrosIngresos() {
  const { month } = useMonth();
  const items = useOtherIncomes();
  const { deleteOtherIncome } = useOtherIncomeActions();
  const status = useDataStatus();
  const refresh = useRefresh();

  const [editing, setEditing] = useState<RawOtherIncome | "new" | null>(null);
  const [deleting, setDeleting] = useState<RawOtherIncome | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const total = items.reduce((sum, o) => sum + o.amount, 0);
  const monthName = monthLabel(month).split(" ")[0].toLowerCase();

  if (status === "loading") return <ScreenSkeleton cards={3} />;
  if (status === "error") return <ErrorState onRetry={refresh} />;

  return (
    <div className="screen home-stagger">
      <BackHeader over="Más" title="Otros ingresos" />

      <p className="note note--blue">
        Ingresos extra personales (negocios, trabajos aparte). No entran al reparto del
        hogar.
      </p>

      <div className="dark-card income-total">
        <span className="dark-card-label">Extra de {monthName}</span>
        <CountUp className="dark-card-value" value={total} format={formatUSD} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="coins"
          title="Aún no hay ingresos extra"
          text="Anota lo que ganes por tu marca, edición u otro trabajo aparte."
          actionLabel="Agregar ingreso"
          onAction={() => setEditing("new")}
        />
      ) : (
        <div className="card extra-list">
          {items.map((o) => (
            <div className="extra-row" key={o.id}>
              <span className="extra-icon">
                <Icon name="coins" size={18} />
              </span>
              <button type="button" className="extra-main" onClick={() => setEditing(o)}>
                <span className="extra-source">{o.source}</span>
                <span className="extra-note">
                  {o.note.trim() || "Sin detalle"}
                  {o.day ? ` · día ${o.day}` : ""}
                </span>
              </button>
              <span className="extra-amount">{formatUSD(o.amount)}</span>
              <IconButton
                label={`Eliminar ${o.source}`}
                onClick={() => setDeleting(o)}
              >
                <Icon name="trash" size={16} />
              </IconButton>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 ? (
        <Button
          block
          variant="soft"
          icon={<Icon name="plus" size={16} />}
          onClick={() => setEditing("new")}
        >
          Agregar ingreso
        </Button>
      ) : null}

      {editing !== null ? (
        <ExtraSheet
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={(message) => setToast(message)}
        />
      ) : null}

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <span className="dialog-icon">
          <Icon name="trash" size={22} />
        </span>
        <h2 className="dialog-title">¿Eliminar «{deleting?.source}»?</h2>
        <p className="dialog-text">
          Se quitará de tus ingresos extra. El reparto del hogar no cambia.
        </p>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button
            variant="coral"
            onClick={async () => {
              const target = deleting;
              setDeleting(null);
              if (target) {
                await deleteOtherIncome(target.id);
                setToast("Ingreso eliminado");
              }
            }}
          >
            Eliminar
          </Button>
        </div>
      </Dialog>

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}

function ExtraSheet({
  initial,
  onClose,
  onDone
}: {
  initial: RawOtherIncome | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { createOtherIncome, updateOtherIncome, isSaving } = useOtherIncomeActions();
  const [source, setSource] = useState(initial?.source ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [day, setDay] = useState(initial?.day ? String(initial.day) : "");
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setError(null);
    const value = Number(amount.replace(",", "."));
    const dayValue = day.trim() ? Number(day) : undefined;

    if (source.trim().length < 2) {
      setError("Escribe el nombre del negocio o la fuente.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Escribe un monto mayor que cero.");
      return;
    }
    if (dayValue !== undefined && (!Number.isInteger(dayValue) || dayValue < 1 || dayValue > 31)) {
      setError("El día debe estar entre 1 y 31.");
      return;
    }

    const draft = { source: source.trim(), note: note.trim(), amount: value, day: dayValue };
    try {
      if (initial) await updateOtherIncome({ id: initial.id, patch: draft });
      else await createOtherIncome(draft);
      onDone(initial ? "Ingreso actualizado" : "Ingreso agregado");
      onClose();
    } catch {
      setError("No pudimos guardar el ingreso. Inténtalo de nuevo.");
    }
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title={initial ? "Editar ingreso" : "Nuevo ingreso"}
      footer={
        <Button block onClick={onSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar ingreso"}
        </Button>
      }
    >
      <Field label="Fuente" value={source} onChange={setSource} placeholder="Marca de ropa" />
      <Field label="Qué fue" value={note} onChange={setNote} placeholder="Venta de 3 camisas" />
      <Field
        label="Monto"
        value={amount}
        onChange={setAmount}
        inputMode="decimal"
        placeholder="60.00"
      />
      <Field
        label="Día (opcional)"
        value={day}
        onChange={setDay}
        inputMode="numeric"
        placeholder="12"
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}