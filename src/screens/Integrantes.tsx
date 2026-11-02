import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackHeader } from "../components/ScreenHeader";
import { PersonRow } from "../components/PersonRow";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Sheet } from "../components/Sheet";
import { Field } from "../components/Field";
import { useDevMode } from "../lib/session";
import { useHousehold, usePeople } from "../data/mock";

export function Integrantes() {
  const household = useHousehold();
  const people = usePeople();
  const dev = useDevMode();
  const [adding, setAdding] = useState(false);

  const hasFreeSlot = people.length < 3;

  return (
    <div className="screen">
      <BackHeader over={household.name} title="Integrantes" />

      <span className="full-pill">3 de 3 · hogar completo</span>

      <div className="card members-list">
        {people.map((p) => (
          <PersonRow key={p.id} person={p} />
        ))}
      </div>

      <div className="code-chip">
        <span>Código del hogar</span>
        <strong>{household.code}</strong>
      </div>

      {hasFreeSlot || dev ? (
        <Button block variant="soft" onClick={() => setAdding(true)}>
          Agregar persona
        </Button>
      ) : null}

      <AddPersonSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function AddPersonSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<null | "code" | "name">(null);
  const [name, setName] = useState("");

  return (
    <Sheet
      open={open}
      onClose={() => {
        setMode(null);
        onClose();
      }}
      title="Agregar persona"
    >
      <div className="add-options">
        <button
          type="button"
          className={`add-option${mode === "code" ? " is-on" : ""}`}
          onClick={() => setMode("code")}
        >
          <span className="add-option-icon">
            <Icon name="user-plus" size={18} />
          </span>
          <span className="add-option-text">
            <span className="add-option-title">Invitar con código</span>
            <span className="add-option-sub">
              Cada quien usa su cuenta y ve todo en tiempo real.
            </span>
          </span>
        </button>

        <button
          type="button"
          className={`add-option${mode === "name" ? " is-on" : ""}`}
          onClick={() => setMode("name")}
        >
          <span className="add-option-icon add-option-icon--maiz">
            <Icon name="pencil" size={18} />
          </span>
          <span className="add-option-text">
            <span className="add-option-title">Solo con su nombre</span>
            <span className="add-option-sub">
              Sin cuenta: tú llevas sus datos. Puedes invitarla después.
            </span>
          </span>
        </button>
      </div>

      {mode === "code" ? (
        <Button block onClick={() => navigate("/invitar")}>
          Ver el código para invitar
        </Button>
      ) : null}

      {mode === "name" ? (
        <>
          <Field label="Nombre" value={name} onChange={setName} />
          <Button block onClick={() => { setMode(null); setName(""); onClose(); }} disabled={name.trim() === ""}>
            Agregar
          </Button>
        </>
      ) : null}

      <Button variant="ghost" block onClick={() => { setMode(null); onClose(); }}>
        Cancelar
      </Button>
    </Sheet>
  );
}
