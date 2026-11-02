import { useState } from "react";
import { BackHeader } from "../components/ScreenHeader";
import { Button, IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import { IconSquare } from "../components/IconSquare";
import { Switch } from "../components/Switch";
import { Sheet } from "../components/Sheet";
import { Field } from "../components/Field";
import { Segmented } from "../components/Segmented";
import { ConfirmDelete } from "../components/Dialog";
import { Toast } from "../components/Toast";
import { formatUSDPlain } from "../lib/format";
import {
  ISR_BRACKETS_2025,
  TAX_SOURCE_NOTE,
  type Deduction,
  type DeductionBracket,
  type DeductionType
} from "../lib/calc";
import { useDeductionActions, useDeductions } from "../data";

const TYPE_OPTIONS: { value: DeductionType; label: string }[] = [
  { value: "percent", label: "Porcentaje" },
  { value: "fixed", label: "Monto fijo" },
  { value: "bracket", label: "Tabla" }
];

const STYLE: Record<string, { icon: "shield" | "receipt" | "wallet"; color: string; colorBg: string }> = {
  afp: { icon: "shield", color: "#0B7C60", colorBg: "#DDF5EC" },
  isss: { icon: "shield", color: "#2F3FA0", colorBg: "#E7EAFB" },
  isr: { icon: "receipt", color: "#D5503F", colorBg: "#FDE6E3" },
  custom: { icon: "wallet", color: "#6A4BD8", colorBg: "#ECE6FD" }
};

function styleOf(d: Deduction) {
  return STYLE[d.key ?? "custom"] ?? STYLE.custom;
}

function pctLabel(rate: number): string {
  return `${(rate * 100).toLocaleString("en-US", { maximumFractionDigits: 4 })}%`;
}

function summary(d: Deduction): string {
  if (d.type === "percent") {
    const parts = [pctLabel(d.value)];
    if (d.maxBase != null) parts.push(`base máx ${formatUSDPlain(d.maxBase)}`);
    if (d.cap != null) parts.push(`tope ${formatUSDPlain(d.cap)}`);
    return parts.join(" · ");
  }
  if (d.type === "fixed") {
    return `Monto fijo ${formatUSDPlain(d.value)}${
      d.cap != null ? ` · tope ${formatUSDPlain(d.cap)}` : ""
    }`;
  }
  return `Tabla de ${d.brackets?.length ?? 0} tramos`;
}

function num(value: string): number {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function Descuentos() {
  const deductions = useDeductions();
  const { updateDeduction, deleteDeduction, resetLawValues, isSaving } = useDeductionActions();
  const [editing, setEditing] = useState<Deduction | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Deduction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const nextOrder = Math.max(0, ...deductions.map((d) => d.order)) + 1;
  const sorted = [...deductions].sort((a, b) => a.order - b.order);

  async function onToggle(d: Deduction, active: boolean) {
    await updateDeduction({ id: d.id, patch: { active } });
  }

  async function onReset() {
    await resetLawValues();
    setToast("Valores de ley restablecidos");
  }

  async function onDelete() {
    if (!deleting) return;
    await deleteDeduction(deleting.id);
    setDeleting(null);
    setToast("Descuento eliminado");
  }

  return (
    <div className="screen home-stagger">
      <BackHeader over="El Salvador" title="Descuentos" />

      <p className="note note--blue">
        Actívalos o desactívalos, y ajusta los valores si la ley o tu trabajo cambian. Los
        netos y el reparto se recalculan en toda la app.
      </p>

      <div className="ded-list">
        {sorted.map((d) => {
          const s = styleOf(d);
          return (
            <article className={`card ded-card${d.active ? "" : " is-off"}`} key={d.id}>
              <IconSquare icon={s.icon} color={s.color} colorBg={s.colorBg} size={36} />
              <div className="ded-main">
                <span className="ded-name">
                  {d.name}
                  {d.verify ? <span className="ded-badge">Verificar</span> : null}
                </span>
                <span className="ded-sub">{summary(d)}</span>
              </div>
              <div className="ded-actions">
                <Switch
                  checked={d.active}
                  onChange={(next) => void onToggle(d, next)}
                  label={`Activar ${d.name}`}
                />
                <IconButton
                  label={`Editar ${d.name}`}
                  onClick={() => setEditing(d)}
                >
                  <Icon name="pencil" size={16} />
                </IconButton>
                <IconButton
                  label={`Eliminar ${d.name}`}
                  onClick={() => setDeleting(d)}
                >
                  <Icon name="trash" size={16} />
                </IconButton>
              </div>
            </article>
          );
        })}
      </div>

      <Button
        variant="soft"
        block
        icon={<Icon name="plus" size={17} />}
        onClick={() => setCreating(true)}
      >
        Agregar descuento
      </Button>

      <Button
        variant="ghost"
        block
        icon={<Icon name="refresh" size={16} />}
        onClick={() => void onReset()}
        disabled={isSaving}
      >
        Restablecer valores de ley
      </Button>

      <p className="help-text">{TAX_SOURCE_NOTE}</p>

      {creating ? (
        <DeductionSheet
          open
          nextOrder={nextOrder}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <DeductionSheet
          open
          deduction={editing}
          nextOrder={nextOrder}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <ConfirmDelete
        open={deleting !== null}
        name={deleting?.name ?? ""}
        onClose={() => setDeleting(null)}
        onConfirm={() => void onDelete()}
      />

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}

function DeductionSheet({
  open,
  deduction,
  nextOrder,
  onClose
}: {
  open: boolean;
  deduction?: Deduction;
  nextOrder: number;
  onClose: () => void;
}) {
  const { createDeduction, updateDeduction, isSaving } = useDeductionActions();
  const [name, setName] = useState(deduction?.name ?? "");
  const [type, setType] = useState<DeductionType>(deduction?.type ?? "fixed");
  const [value, setValue] = useState(
    deduction
      ? deduction.type === "percent"
        ? String(deduction.value * 100)
        : String(deduction.value)
      : ""
  );
  const [maxBase, setMaxBase] = useState(
    deduction?.maxBase != null ? String(deduction.maxBase) : ""
  );
  const [cap, setCap] = useState(deduction?.cap != null ? String(deduction.cap) : "");
  const [active, setActive] = useState(deduction?.active ?? true);
  const [brackets, setBrackets] = useState<DeductionBracket[]>(
    deduction?.brackets?.map((b) => ({ ...b })) ?? ISR_BRACKETS_2025.map((b) => ({ ...b }))
  );

  const isLaw = deduction?.isLaw ?? false;
  const isPercent = type === "percent";
  const isBracket = type === "bracket";
  const valueLabel = isPercent ? "Porcentaje (%)" : "Monto mensual (US$)";

  function updateBracket(index: number, patch: Partial<DeductionBracket>) {
    setBrackets((list) => list.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function addBracket() {
    const last = brackets[brackets.length - 1];
    const from = last?.to != null ? last.to + 0.01 : 0.01;
    setBrackets((list) => [
      ...list,
      { from, to: null, rate: 0, over: from, fixed: 0 }
    ]);
  }

  function removeBracket(index: number) {
    setBrackets((list) => list.filter((_, i) => i !== index));
  }

  async function onSave() {
    const finalName = name.trim() || (isLaw ? "Descuento de ley" : "Descuento");
    const patch = {
      key: deduction?.key,
      name: finalName,
      type,
      value: isPercent ? num(value) / 100 : type === "fixed" ? num(value) : 0,
      maxBase: isPercent && maxBase.trim() !== "" ? num(maxBase) : undefined,
      cap: !isBracket && cap.trim() !== "" ? num(cap) : undefined,
      active,
      isLaw,
      order: deduction?.order ?? nextOrder,
      brackets: isBracket ? brackets : undefined,
      verify: deduction?.verify
    };
    if (deduction) await updateDeduction({ id: deduction.id, patch });
    else await createDeduction(patch);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={deduction ? "Editar descuento" : "Agregar descuento"}
      footer={
        <Button block onClick={() => void onSave()} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar descuento"}
        </Button>
      }
    >
      <Field
        label="Nombre"
        value={name}
        onChange={setName}
        placeholder="Préstamo, seguro privado, pensión..."
        autoFocus
      />

      <span className="sheet-label">Tipo</span>
      <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} />

      {isBracket ? (
        <>
          <span className="sheet-label">Tramos de la tabla</span>
          <div className="bracket-list">
            {brackets.map((b, i) => (
              <div className="bracket-card" key={i}>
                <div className="bracket-head">
                  <span>Tramo {i + 1}</span>
                  {brackets.length > 1 ? (
                    <IconButton
                      label={`Quitar tramo ${i + 1}`}
                      onClick={() => removeBracket(i)}
                    >
                      <Icon name="x" size={14} />
                    </IconButton>
                  ) : null}
                </div>
                <div className="bracket-fields">
                  <label className="bracket-field">
                    Desde
                    <input
                      type="number"
                      inputMode="decimal"
                      value={b.from}
                      onChange={(e) => updateBracket(i, { from: num(e.target.value) })}
                    />
                  </label>
                  <label className="bracket-field">
                    Hasta
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Sin tope"
                      value={b.to ?? ""}
                      onChange={(e) =>
                        updateBracket(i, {
                          to: e.target.value === "" ? null : num(e.target.value)
                        })
                      }
                    />
                  </label>
                  <label className="bracket-field">
                    Tasa (%)
                    <input
                      type="number"
                      inputMode="decimal"
                      value={b.rate * 100}
                      onChange={(e) => updateBracket(i, { rate: num(e.target.value) / 100 })}
                    />
                  </label>
                  <label className="bracket-field">
                    Exceso desde
                    <input
                      type="number"
                      inputMode="decimal"
                      value={b.over}
                      onChange={(e) => updateBracket(i, { over: num(e.target.value) })}
                    />
                  </label>
                  <label className="bracket-field">
                    Cuota fija
                    <input
                      type="number"
                      inputMode="decimal"
                      value={b.fixed}
                      onChange={(e) => updateBracket(i, { fixed: num(e.target.value) })}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" block icon={<Icon name="plus" size={15} />} onClick={addBracket}>
            Agregar tramo
          </Button>
        </>
      ) : (
        <>
          <Field
            label={valueLabel}
            type="number"
            inputMode="decimal"
            value={value}
            onChange={setValue}
            placeholder={isPercent ? "7.25" : "50.00"}
          />
          {isPercent ? (
            <Field
              label="Base máxima (opcional)"
              type="number"
              inputMode="decimal"
              value={maxBase}
              onChange={setMaxBase}
              placeholder="Ej. 7045.06"
            />
          ) : null}
          <Field
            label="Tope del descuento (opcional)"
            type="number"
            inputMode="decimal"
            value={cap}
            onChange={setCap}
            placeholder="Ej. 30.00"
          />
        </>
      )}

      <div className="ded-sheet-switch">
        <div className="ded-main">
          <span className="ded-name">Activo</span>
          <span className="ded-sub">Se aplica a los sueldos del hogar.</span>
        </div>
        <Switch checked={active} onChange={setActive} label={`Activar ${name || "descuento"}`} />
      </div>

      {isLaw ? (
        <p className="help-text">
          Este es un descuento de ley. Puedes ajustarlo, desactivarlo o restablecerlo.
        </p>
      ) : null}
    </Sheet>
  );
}