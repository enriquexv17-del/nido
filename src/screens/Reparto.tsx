import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Segmented } from "../components/Segmented";
import { StackedBar } from "../components/StackedBar";
import { Avatar, YouTag } from "../components/Avatar";
import { formatPct, formatUSD } from "../lib/format";
import { useHousehold, usePeople } from "../data/mock";
import { useSession } from "../lib/session";

type Mode = "salary" | "equal";

export function Reparto() {
  const household = useHousehold();
  const people = usePeople();
  const { person } = useSession();
  const [mode, setMode] = useState<Mode>("salary");
  const navigate = useNavigate();

  return (
    <div className="screen">
      <ScreenHeader title="Reparto" month={household.monthLabel} />

      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "salary", label: "Según sueldo" },
          { value: "equal", label: "Partes iguales" }
        ]}
      />

      <div className="card">
        <StackedBar
          height={16}
          segments={people.map((p) => ({
            value: p.sharePct,
            color: `var(${p.color})`,
            label: p.id
          }))}
        />
      </div>

      <div className="reparto-list">
        {people.map((p) => {
          const active = p.id === person.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`card reparto-card${active ? " is-active" : ""}`}
              onClick={active ? () => navigate("/reparto/detalle") : undefined}
              aria-current={active ? "true" : undefined}
            >
              <Avatar person={p} size={38} />
              <div className="reparto-text">
                <span className="reparto-name">
                  {p.name}
                  {p.isYou ? <YouTag /> : null}
                </span>
                <span className="reparto-pct">{formatPct(p.sharePct)} del total</span>
                <span className="reparto-left">Le queda {formatUSD(p.leftover)}</span>
              </div>
              <div className="reparto-right">
                <span className="reparto-amount">{formatUSD(p.shareAmount)}</span>
                <span className="reparto-per">al mes</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="dark-card reparto-total">
        <span className="dark-card-label">Total del hogar</span>
        <span className="dark-card-value">{formatUSD(household.totalExpenses)}</span>
      </div>
    </div>
  );
}
