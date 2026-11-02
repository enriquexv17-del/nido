import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Segmented } from "../components/Segmented";
import { StackedBar } from "../components/StackedBar";
import { Avatar, YouTag } from "../components/Avatar";
import { CountUp } from "../components/CountUp";
import { Button } from "../components/Button";
import { Toast } from "../components/Toast";
import { formatPct, formatUSD } from "../lib/format";
import {
  useHousehold,
  useExpenses,
  usePeopleMode,
  useDataStatus,
  useRefresh,
  useSplit,
  useSplitActions,
  type SplitConfig,
  type SplitMode
} from "../data";
import { useSession } from "../lib/session";
import { EmptyState, ErrorState, ScreenSkeleton } from "../components/States";

const MODE_OPTIONS: { value: SplitMode; label: string }[] = [
  { value: "salary", label: "Según sueldo" },
  { value: "equal", label: "Partes iguales" },
  { value: "manual", label: "% manual" },
  { value: "fixed", label: "Monto fijo" }
];

const round2 = (n: number) => Math.round(n * 100) / 100;

function equalPcts(ids: string[]): Record<string, number> {
  const n = Math.max(1, ids.length);
  const base = round2(100 / n);
  const out: Record<string, number> = {};
  let sum = 0;
  ids.forEach((id, i) => {
    const value = i === n - 1 ? round2(100 - sum) : base;
    out[id] = value;
    sum += value;
  });
  return out;
}

export function Reparto() {
  const household = useHousehold();
  const { person } = useSession();
  const persisted = useSplit();
  const [draft, setDraft] = useState<SplitConfig>(persisted);
  const people = usePeopleMode(draft);
  const expenses = useExpenses();
  const navigate = useNavigate();
  const status = useDataStatus();
  const refresh = useRefresh();
  const { saveSplit, isSaving } = useSplitActions();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setDraft(persisted);
  }, [persisted]);

  const mode = draft.mode;
  const dirty = JSON.stringify(draft) !== JSON.stringify(persisted);

  const manualSum = people.reduce((sum, p) => sum + (draft.manual[p.id] ?? 0), 0);
  const manualValid = Math.abs(manualSum - 100) < 0.01;
  const fixedSum = people.reduce((sum, p) => sum + (draft.fixed[p.id] ?? 0), 0);
  const canSave = dirty && (mode !== "manual" || manualValid);

  function changeMode(next: SplitMode) {
    setDraft((current) => {
      if (next === "manual" && Object.keys(current.manual).length === 0) {
        return { ...current, mode: next, manual: equalPcts(people.map((p) => p.id)) };
      }
      if (next === "fixed" && Object.keys(current.fixed).length === 0) {
        const n = Math.max(1, people.length);
        const base = round2(household.totalExpenses / n);
        const fixed: Record<string, number> = {};
        let sum = 0;
        people.forEach((p, i) => {
          const value = i === n - 1 ? round2(household.totalExpenses - sum) : base;
          fixed[p.id] = Math.max(0, value);
          sum += value;
        });
        return { ...current, mode: next, fixed };
      }
      return { ...current, mode: next };
    });
  }

  function setValue(id: string, value: number) {
    const clean = Math.max(0, value);
    setDraft((current) =>
      current.mode === "manual"
        ? { ...current, manual: { ...current.manual, [id]: clean } }
        : { ...current, fixed: { ...current.fixed, [id]: clean } }
    );
  }

  async function onSave() {
    await saveSplit(draft);
    setToast("Reparto guardado");
  }

  if (status === "loading") return <ScreenSkeleton cards={3} />;
  if (status === "error") return <ErrorState onRetry={refresh} />;
  if (status === "empty") {
    return (
      <div className="screen">
        <ScreenHeader title="Reparto" />
        <EmptyState
          icon="users"
          title="Aún no hay integrantes"
          text="Agrega personas a tu hogar para ver el reparto."
        />
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader title="Reparto" month={household.monthLabel} />

      <Segmented<SplitMode> value={mode} onChange={changeMode} options={MODE_OPTIONS} />

      {mode === "manual" || mode === "fixed" ? (
        <div className="card split-editor">
          {people.map((p) => {
            const value = mode === "manual" ? draft.manual[p.id] ?? 0 : draft.fixed[p.id] ?? 0;
            return (
              <div className="split-edit-row" key={p.id}>
                <Avatar person={p} size={32} />
                <span className="split-edit-name">{p.name}</span>
                <div className="split-input">
                  <span aria-hidden="true">{mode === "manual" ? "%" : "$"}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={mode === "manual" ? 0.01 : 1}
                    value={value}
                    aria-label={
                      mode === "manual"
                        ? `Porcentaje de ${p.name}`
                        : `Monto fijo de ${p.name}`
                    }
                    onChange={(e) => setValue(p.id, Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            );
          })}
          {mode === "manual" ? (
            <span className={`help-text${manualValid ? "" : " split-warn"}`}>
              Suma {manualSum.toFixed(2)}% {manualValid ? "· listo" : "· debe sumar 100%"}
            </span>
          ) : (
            <span className="help-text">
              Suma {formatUSD(fixedSum)} de {formatUSD(household.totalExpenses)} en gastos.
            </span>
          )}
        </div>
      ) : null}

      <div className="card">
        {expenses.length === 0 ? (
          <p className="help-text">Aún no hay gastos este mes.</p>
        ) : (
          <StackedBar
            height={16}
            segments={people.map((p) => ({
              value: p.shareAmount,
              color: `var(${p.color})`,
              label: p.id
            }))}
          />
        )}
      </div>

      {dirty ? (
        <div className="split-preview">
          <span className="split-preview-tag">Vista previa</span>
          <span className="help-text">Así quedaría el reparto. Guárdalo para aplicarlo.</span>
        </div>
      ) : null}

      {expenses.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Sin gastos este mes"
          text="Cuando agregues gastos, aquí verás cuánto paga cada quien."
          actionLabel="Ir a Gastos"
          onAction={() => navigate("/gastos")}
        />
      ) : (
        <div className="reparto-list stagger-list" key={mode}>
          {people.map((p) => {
            const active = p.id === person.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`card reparto-card${active ? " is-active" : ""}`}
                onClick={
                  active
                    ? () => navigate("/reparto/detalle", { state: { split: draft } })
                    : undefined
                }
                aria-current={active ? "true" : undefined}
              >
                <Avatar person={p} size={38} />
                <div className="reparto-text">
                  <span className="reparto-name">
                    {p.name}
                    {p.isYou ? <YouTag /> : null}
                  </span>
                  <span className="reparto-pct">
                    <CountUp value={p.sharePct} format={formatPct} /> del total
                  </span>
                  <span className="reparto-left">
                    Le queda <CountUp value={p.leftover} format={formatUSD} />
                  </span>
                </div>
                <div className="reparto-right">
                  <span className="reparto-amount">
                    <CountUp value={p.shareAmount} format={formatUSD} />
                  </span>
                  <span className="reparto-per">al mes</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Button
        block
        onClick={() => void onSave()}
        disabled={!canSave || isSaving}
      >
        {isSaving ? "Guardando..." : "Guardar reparto"}
      </Button>

      <div className="dark-card reparto-total">
        <span className="dark-card-label">Total del hogar</span>
        <span className="dark-card-value">
          <CountUp value={household.totalExpenses} format={formatUSD} />
        </span>
      </div>

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}