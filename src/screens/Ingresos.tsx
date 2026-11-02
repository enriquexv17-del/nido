import { useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { Chip } from "../components/Chip";
import { Avatar, YouTag } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { Sheet } from "../components/Sheet";
import { Field } from "../components/Field";
import { Switch } from "../components/Switch";
import { Button } from "../components/Button";
import { CountUp } from "../components/CountUp";
import { formatUSD, formatUSDPlain } from "../lib/format";
import { calcNet } from "../lib/calc";
import { useHousehold, useIncomeActions, useMonths, usePeople, type Person } from "../data";

export function Ingresos() {
  const household = useHousehold();
  const people = usePeople();
  const months = useMonths();
  const [month, setMonth] = useState("Nov");
  const [editing, setEditing] = useState<Person | null>(null);

  return (
    <div className="screen">
      <ScreenHeader title="Ingresos" month={household.monthLabel} />

      <div className="income-chips">
        <div className="chip-row">
          {months.map((m) => (
            <Chip key={m} active={m === month} onClick={() => setMonth(m)}>
              {m}
            </Chip>
          ))}
        </div>
        <button type="button" className="chip chip--maize copy-october">
          Copiar de octubre
        </button>
      </div>

      <div className="dark-card income-total">
        <span className="dark-card-label">Neto del hogar en noviembre</span>
        <span className="dark-card-value">
          <CountUp value={household.totalNet} format={formatUSD} />
        </span>
      </div>

      <div className="income-list stagger-list">
        {people.map((p) => {
          const hasDeductions = p.afpOn || p.isssOn;
          return (
            <article className="card income-card" key={p.id}>
              <div className="income-main">
                <Avatar person={p} size={38} />
                <div className="income-id">
                  <span className="income-name">
                    {p.name}
                    {p.isYou ? <YouTag /> : null}
                  </span>
                  <span className="income-gross">Sueldo {formatUSD(p.gross)}</span>
                </div>
                <div className="income-net">
                  <span className="income-net-value">
                    <CountUp value={p.net} format={formatUSD} />
                  </span>
                  <span className="income-net-label">neto</span>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Editar sueldo de ${p.name}`}
                  onClick={() => setEditing(p)}
                >
                  <Icon name="pencil" size={17} />
                </button>
              </div>
              <div className="income-foot">
                {hasDeductions
                  ? `AFP \u2212${formatUSDPlain(p.afp)} · ISSS \u2212${formatUSDPlain(p.isss)}`
                  : "Sin descuentos de ley"}
              </div>
            </article>
          );
        })}
      </div>

      {editing ? <SalarySheet person={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function SalarySheet({ person, onClose }: { person: Person; onClose: () => void }) {
  const { saveIncome, isSaving } = useIncomeActions();
  const [gross, setGross] = useState(person.gross.toFixed(2));
  const [afpOn, setAfpOn] = useState(person.afpOn);
  const [isssOn, setIsssOn] = useState(person.isssOn);
  const [isrOn, setIsrOn] = useState(person.isrOn);

  const grossNum = Number.parseFloat(gross) || 0;
  const ded = calcNet(grossNum, { afpOn, isssOn, isrOn });
  const noDeductions = !afpOn && !isssOn;

  async function onSave() {
    await saveIncome({
      memberId: person.id,
      gross: Number.parseFloat(gross) || 0,
      afpOn,
      isssOn,
      isrOn
    });
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Sueldo de noviembre"
      footer={
        <Button block onClick={onSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar sueldo"}
        </Button>
      }
    >
      <div className="sheet-person">
        <Avatar person={person} size={24} />
        <span>{person.name}</span>
      </div>

      <Field label="Sueldo bruto del mes" value={gross} onChange={setGross} autoFocus />

      <span className="sheet-label">Descuentos de ley (El Salvador)</span>

      <div className="deduction-card">
        <div className="deduction-row">
          <div className="deduction-text">
            <span className="deduction-name">AFP · 7.25%</span>
            <span className="deduction-sub">Pensión</span>
          </div>
          <span className="deduction-amount">
            {afpOn ? `\u2212${formatUSDPlain(ded.afp)}` : "—"}
          </span>
          <Switch checked={afpOn} onChange={setAfpOn} label="AFP" />
        </div>

        <div className="deduction-row">
          <div className="deduction-text">
            <span className="deduction-name">ISSS · 3%</span>
            <span className="deduction-sub">Salud · tope $30</span>
          </div>
          <span className="deduction-amount">
            {isssOn ? `\u2212${formatUSDPlain(ded.isss)}` : "—"}
          </span>
          <Switch checked={isssOn} onChange={setIsssOn} label="ISSS" />
        </div>

        <div className="deduction-row">
          <div className="deduction-text">
            <span className="deduction-name">Renta (ISR)</span>
            <span className="deduction-sub">Solo si pasas de $550</span>
          </div>
          <span className="deduction-amount">—</span>
          <Switch checked={isrOn} onChange={setIsrOn} label="Renta (ISR)" />
        </div>
      </div>

      <div className="receive-box">
        <span>Recibirás</span>
        <strong>
          <CountUp value={ded.net} format={formatUSD} />
        </strong>
      </div>

      <p className="sheet-hint">
        {noDeductions
          ? "Tu trabajo no los cobra: déjalos apagados."
          : "Apaga el que tu trabajo no cobre."}
      </p>
    </Sheet>
  );
}
