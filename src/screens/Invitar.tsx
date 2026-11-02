import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EntryScreen } from "../layout/EntryShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { PersonRow } from "../components/PersonRow";
import { Toast } from "../components/Toast";
import { useHousehold, usePeople } from "../data";
import { copyText, useSession } from "../lib/session";

export function Invitar() {
  const navigate = useNavigate();
  const household = useHousehold();
  const people = usePeople();
  const { person } = useSession();
  const [toast, setToast] = useState<string | null>(null);

  const waText = encodeURIComponent(
    `Únete a mi hogar en Nido con este código: ${household.code}`
  );

  const freeSlots = Math.max(0, 3 - people.length);

  return (
    <EntryScreen
      step={3}
      title="Tu hogar está listo"
      subtitle="Invita a las otras personas con este código."
      footer={
        <Button block onClick={() => navigate("/inicio")}>
          Ir al inicio
        </Button>
      }
    >
      <div className="invite-code-card">
        <span className="invite-code-label">Código del hogar</span>
        <span className="invite-code">{household.code}</span>
        <div className="invite-code-actions">
          <Button
            variant="ghost"
            className="btn--sm"
            icon={<Icon name="copy" size={16} />}
            onClick={async () => {
              await copyText(household.code);
              setToast("Código copiado");
            }}
          >
            Copiar
          </Button>
          <a
            className="btn btn--whatsapp btn--sm"
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="whatsapp" size={16} />
            WhatsApp
          </a>
        </div>
      </div>

      <div className="invite-members">
        <span className="section-label">
          Integrantes · {people.length} de 3
        </span>
        {person.id ? (
          <PersonRow person={person}>
            <span className="person-row-owner">Tú · administras el hogar</span>
          </PersonRow>
        ) : null}
        {Array.from({ length: freeSlots }, (_, i) => (
          <div className="slot-card" key={i}>
            <span className="slot-bubble">{people.length + i + 1}</span>
            <div className="slot-text">
              <span className="slot-title">Persona {people.length + i + 1}</span>
              <span className="slot-sub">Lugar libre</span>
            </div>
          </div>
        ))}
      </div>

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </EntryScreen>
  );
}
