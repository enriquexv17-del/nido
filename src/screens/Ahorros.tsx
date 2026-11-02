import { useState } from "react";
import { BackHeader } from "../components/ScreenHeader";
import { Button, IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import { Sheet } from "../components/Sheet";
import { Dialog } from "../components/Dialog";
import { Field } from "../components/Field";
import { Chip } from "../components/Chip";
import { Toast } from "../components/Toast";
import { CountUp } from "../components/CountUp";
import { EmptyState, ErrorState, ScreenSkeleton } from "../components/States";
import { formatUSD } from "../lib/format";
import { monthLabel } from "../lib/month";
import {
  FREQUENCY_LABEL,
  FREQUENCY_SHORT,
  goalProgress,
  round2,
  type SavingsFrequency
} from "../lib/calc";
import {
  useDataStatus,
  useFundActions,
  useFunds,
  useGoalActions,
  useGoals,
  useMonth,
  useRefresh,
  useSavingSummary,
  type RawFund,
  type RawGoal
} from "../data";

/**
 * Ahorros y metas (Fase 3). Personal: lo que te sobra del mes (neto + otros
 * ingresos − tu parte de gastos) se reparte en fondos editables, y aparte
 * llevas metas con su progreso. No cambia el reparto del hogar.
 */
export function Ahorros() {
  const { month } = useMonth();
  const summary = useSavingSummary();
  const funds = useFunds();
  const goals = useGoals();
  const status = useDataStatus();
  const refresh = useRefresh();

  const [editingFund, setEditingFund] = useState<RawFund | "new" | null>(null);
  const [deletingFund, setDeletingFund] = useState<RawFund | null>(null);
  const [editingGoal, setEditingGoal] = useState<RawGoal | "new" | null>(null);
  const [addingTo, setAddingTo] = useState<RawGoal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<RawGoal | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { deleteFund } = useFundActions();
  const { deleteGoal } = useGoalActions();

  const amountFor = (id: string) =>
    summary.distribution.find((d) => d.fundId === id)?.amount ?? 0;
  const pctTotal = funds.reduce((sum, f) => sum + f.pct, 0);

  if (status === "loading") return <ScreenSkeleton cards={4} />;
  if (status === "error") return <ErrorState onRetry={refresh} />;

  return (
    <div className="screen home-stagger">
      <BackHeader over="Más" title="Ahorros y metas" />

      <p className="note note--blue">
        Tu ahorro es personal. No cambia el reparto del hogar.
      </p>

      {/* Bloque 1 · Lo que te sobra este mes */}
      <div className="dark-card income-total">
        <span className="dark-card-label">Te sobra este mes</span>
        <CountUp className="dark-card-value" value={summary.available} format={formatUSD} />
      </div>

      <div className="card">
        <div className="info-row">
          <span>Tu sueldo neto</span>
          <strong>{formatUSD(summary.net)}</strong>
        </div>
        <div className="info-row">
          <span>Otros ingresos</span>
          <strong>{formatUSD(summary.extra)}</strong>
        </div>
        <div className="info-row">
          <span>Tu parte de gastos</span>
          <strong>−{formatUSD(summary.share)}</strong>
        </div>
      </div>

      {/* Bloque 2 · Ahorro automático */}
      <span className="savings-label">Ahorro automático</span>

      {funds.length === 0 ? (
        <EmptyState
          icon="savings"
          title="Sin fondos de ahorro"
          text="Divide lo que te sobra en fondos: emergencia, seguro, tu marca."
          actionLabel="Agregar fondo"
          onAction={() => setEditingFund("new")}
        />
      ) : (
        <>
          <div className="card savings-list">
            {funds.map((f) => (
              <div className="savings-row" key={f.id}>
                <span className="savings-pct">{f.pct}%</span>
                <button
                  type="button"
                  className="savings-main"
                  onClick={() => setEditingFund(f)}
                >
                  <span className="savings-name">{f.name}</span>
                  <span className="savings-note">
                    {f.note?.trim() || `${f.pct}% de lo que sobra`}
                  </span>
                </button>
                <span className="savings-amount">{formatUSD(amountFor(f.id))}</span>
                <IconButton
                  label={`Eliminar ${f.name}`}
                  onClick={() => setDeletingFund(f)}
                >
                  <Icon name="trash" size={16} />
                </IconButton>
              </div>
            ))}
          </div>

          {pctTotal > 100 ? (
            <p className="note note--blue">
              Los porcentajes suman {pctTotal}%. Se reparten en proporción para no
              ahorrar de más.
            </p>
          ) : null}

          <div className="card">
            <div className="info-row">
              <span>Total ahorro</span>
              <strong>{formatUSD(summary.totalSaved)}</strong>
            </div>
            <div className="info-row">
              <span>Queda libre</span>
              <strong>{formatUSD(summary.free)}</strong>
            </div>
          </div>

          <Button
            block
            variant="soft"
            icon={<Icon name="plus" size={16} />}
            onClick={() => setEditingFund("new")}
          >
            Agregar fondo
          </Button>
        </>
      )}

      {/* Bloque 3 · Mis metas */}
      <span className="savings-label">Mis metas</span>

      {goals.length === 0 ? (
        <EmptyState
          icon="chart"
          title="Aún no hay metas"
          text="Crea una meta y te decimos cuánto apartar para llegar."
          actionLabel="Agregar meta"
          onAction={() => setEditingGoal("new")}
        />
      ) : (
        <>
          {goals.map((g) => {
            const progress = goalProgress(g, month);
            return (
              <article className="card goal-card" key={g.id}>
                <div className="goal-head">
                  <div className="goal-text">
                    <span className="goal-name">{g.name}</span>
                    <span className="goal-sub">
                      {formatUSD(g.saved)} de {formatUSD(g.target)}
                    </span>
                  </div>
                  <IconButton label={`Editar ${g.name}`} onClick={() => setEditingGoal(g)}>
                    <Icon name="pencil" size={16} />
                  </IconButton>
                  <IconButton
                    label={`Eliminar ${g.name}`}
                    onClick={() => setDeletingGoal(g)}
                  >
                    <Icon name="trash" size={16} />
                  </IconButton>
                </div>

                <div className="progress">
                  <span style={{ transform: `scaleX(${progress.progressPct / 100})` }} />
                </div>
                <div className="progress-foot">
                  <span>{progress.progressPct}%</span>
                  <span>
                    {progress.remaining > 0
                      ? `Aparta ${formatUSD(progress.perPeriod)} ${
                          FREQUENCY_LABEL[g.frequency]
                        }${g.dueMonth ? ` para ${monthLabel(g.dueMonth).toLowerCase()}` : ""}`
                      : "Meta cumplida"}
                  </span>
                </div>

                {progress.remaining > 0 ? (
                  <Button
                    variant="ghost"
                    className="goal-add"
                    icon={<Icon name="plus" size={15} />}
                    onClick={() => setAddingTo(g)}
                  >
                    Sumar ahorro
                  </Button>
                ) : null}
              </article>
            );
          })}

          <Button
            block
            variant="soft"
            icon={<Icon name="plus" size={16} />}
            onClick={() => setEditingGoal("new")}
          >
            Agregar meta
          </Button>
        </>
      )}

      {editingFund !== null ? (
        <FundSheet
          key={editingFund === "new" ? "new" : editingFund.id}
          initial={editingFund === "new" ? null : editingFund}
          onClose={() => setEditingFund(null)}
          onDone={(message) => setToast(message)}
        />
      ) : null}

      {editingGoal !== null ? (
        <GoalSheet
          key={editingGoal === "new" ? "new" : editingGoal.id}
          initial={editingGoal === "new" ? null : editingGoal}
          month={month}
          onClose={() => setEditingGoal(null)}
          onDone={(message) => setToast(message)}
        />
      ) : null}

      {addingTo !== null ? (
        <AddSavingSheet
          key={addingTo.id}
          goal={addingTo}
          onClose={() => setAddingTo(null)}
          onDone={(message) => setToast(message)}
        />
      ) : null}

      <Dialog open={deletingFund !== null} onClose={() => setDeletingFund(null)}>
        <span className="dialog-icon">
          <Icon name="trash" size={22} />
        </span>
        <h2 className="dialog-title">¿Eliminar «{deletingFund?.name}»?</h2>
        <p className="dialog-text">
          Dejará de recibir su parte de lo que sobra. Tu reparto del hogar no cambia.
        </p>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={() => setDeletingFund(null)}>
            Cancelar
          </Button>
          <Button
            variant="coral"
            onClick={async () => {
              const target = deletingFund;
              setDeletingFund(null);
              if (target) {
                await deleteFund(target.id);
                setToast("Fondo eliminado");
              }
            }}
          >
            Eliminar
          </Button>
        </div>
      </Dialog>

      <Dialog open={deletingGoal !== null} onClose={() => setDeletingGoal(null)}>
        <span className="dialog-icon">
          <Icon name="trash" size={22} />
        </span>
        <h2 className="dialog-title">¿Eliminar «{deletingGoal?.name}»?</h2>
        <p className="dialog-text">Se borrará la meta y su progreso. No se puede deshacer.</p>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={() => setDeletingGoal(null)}>
            Cancelar
          </Button>
          <Button
            variant="coral"
            onClick={async () => {
              const target = deletingGoal;
              setDeletingGoal(null);
              if (target) {
                await deleteGoal(target.id);
                setToast("Meta eliminada");
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

function FundSheet({
  initial,
  onClose,
  onDone
}: {
  initial: RawFund | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { createFund, updateFund, isSaving } = useFundActions();
  const [name, setName] = useState(initial?.name ?? "");
  const [pct, setPct] = useState(initial ? String(initial.pct) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setError(null);
    const value = Number(pct.replace(",", "."));
    if (name.trim().length < 2) {
      setError("Escribe un nombre para el fondo.");
      return;
    }
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError("El porcentaje debe estar entre 0 y 100.");
      return;
    }

    const draft = { name: name.trim(), pct: value, note: note.trim() || undefined };
    try {
      if (initial) await updateFund({ id: initial.id, patch: draft });
      else await createFund(draft);
      onDone(initial ? "Fondo actualizado" : "Fondo agregado");
      onClose();
    } catch {
      setError("No pudimos guardar el fondo. Inténtalo de nuevo.");
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={initial ? "Editar fondo" : "Nuevo fondo"}
      footer={
        <Button block onClick={onSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar fondo"}
        </Button>
      }
    >
      <Field label="Nombre" value={name} onChange={setName} placeholder="Fondo de emergencia" />
      <Field
        label="Porcentaje de lo que sobra"
        value={pct}
        onChange={setPct}
        inputMode="decimal"
        placeholder="40"
      />
      <Field
        label="Nota (opcional)"
        value={note}
        onChange={setNote}
        placeholder="Para imprevistos"
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}

function GoalSheet({
  initial,
  month,
  onClose,
  onDone
}: {
  initial: RawGoal | null;
  month: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { createGoal, updateGoal, isSaving } = useGoalActions();
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial ? String(initial.target) : "");
  const [saved, setSaved] = useState(initial ? String(initial.saved) : "");
  const [frequency, setFrequency] = useState<SavingsFrequency>(
    initial?.frequency ?? "monthly"
  );
  const [dueMonth, setDueMonth] = useState(initial?.dueMonth ?? "");
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setError(null);
    const targetValue = Number(target.replace(",", "."));
    const savedValue = saved.trim() ? Number(saved.replace(",", ".")) : 0;

    if (name.trim().length < 2) {
      setError("Escribe un nombre para la meta.");
      return;
    }
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      setError("El objetivo debe ser mayor que cero.");
      return;
    }
    if (!Number.isFinite(savedValue) || savedValue < 0) {
      setError("Lo ahorrado no puede ser negativo.");
      return;
    }
    if (dueMonth && dueMonth < month) {
      setError("El mes límite no puede ser anterior al mes activo.");
      return;
    }

    const draft = {
      name: name.trim(),
      target: targetValue,
      saved: savedValue,
      frequency,
      dueMonth: dueMonth || undefined
    };
    try {
      if (initial) await updateGoal({ id: initial.id, patch: draft });
      else await createGoal(draft);
      onDone(initial ? "Meta actualizada" : "Meta agregada");
      onClose();
    } catch {
      setError("No pudimos guardar la meta. Inténtalo de nuevo.");
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={initial ? "Editar meta" : "Nueva meta"}
      footer={
        <Button block onClick={onSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar meta"}
        </Button>
      }
    >
      <Field label="Nombre" value={name} onChange={setName} placeholder="Teléfono nuevo" />
      <Field
        label="Objetivo"
        value={target}
        onChange={setTarget}
        inputMode="decimal"
        placeholder="300.00"
      />
      <Field
        label="Ahorrado hasta ahora"
        value={saved}
        onChange={setSaved}
        inputMode="decimal"
        placeholder="0.00"
      />

      <span className="sheet-label">Cada cuánto apartas</span>
      <div className="chip-row">
        {(["daily", "weekly", "monthly"] as SavingsFrequency[]).map((f) => (
          <Chip key={f} active={frequency === f} onClick={() => setFrequency(f)}>
            {FREQUENCY_SHORT[f]}
          </Chip>
        ))}
      </div>

      <Field label="Mes límite (opcional)" type="month" value={dueMonth} onChange={setDueMonth} />

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}

function AddSavingSheet({
  goal,
  onClose,
  onDone
}: {
  goal: RawGoal;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { updateGoal, isSaving } = useGoalActions();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setError(null);
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Escribe un monto mayor que cero.");
      return;
    }

    try {
      await updateGoal({
        id: goal.id,
        patch: {
          name: goal.name,
          target: goal.target,
          saved: round2(goal.saved + value),
          frequency: goal.frequency,
          dueMonth: goal.dueMonth
        }
      });
      onDone("Ahorro sumado");
      onClose();
    } catch {
      setError("No pudimos sumar el ahorro. Inténtalo de nuevo.");
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Sumar a «${goal.name}»`}
      footer={
        <Button block onClick={onSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Sumar ahorro"}
        </Button>
      }
    >
      <p className="sheet-hint">
        Llevas {formatUSD(goal.saved)} de {formatUSD(goal.target)}.
      </p>
      <Field
        label="Monto"
        value={amount}
        onChange={setAmount}
        inputMode="decimal"
        placeholder="20.00"
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}