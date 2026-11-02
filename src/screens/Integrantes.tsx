import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackHeader } from "../components/ScreenHeader";
import { PersonRow } from "../components/PersonRow";
import { Button, IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import { Sheet } from "../components/Sheet";
import { Field } from "../components/Field";
import { Dialog } from "../components/Dialog";
import { Toast } from "../components/Toast";
import { useDevMode, useSession, copyText } from "../lib/session";
import {
  useHousehold,
  useMemberActions,
  usePeople,
  type Person
} from "../data";

const PALETTE = ["--p1", "--p2", "--p3"];

function nextColor(people: Person[]): string {
  return PALETTE.find((c) => !people.some((p) => p.color === c)) ?? PALETTE[0];
}

export function Integrantes() {
  const household = useHousehold();
  const people = usePeople();
  const { person } = useSession();
  const { removeMember } = useMemberActions();
  const dev = useDevMode();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Person | null>(null);

  const isAdmin = person.role === "admin";
  const hasFreeSlot = people.length < 3;
  const full = people.length >= 3;

  return (
    <div className="screen">
      <BackHeader over={household.name} title="Integrantes" />

      <span className="full-pill">
        {people.length} de 3 · {full ? "hogar completo" : "hay lugar"}
      </span>

      <div className="card members-list">
        {people.map((p) => (
          <PersonRow key={p.id} person={p}>
            {isAdmin && p.id !== person.id ? (
              <IconButton label={`Quitar a ${p.name}`} onClick={() => setRemoving(p)}>
                <Icon name="trash" size={17} />
              </IconButton>
            ) : null}
          </PersonRow>
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

      <AddPersonSheet
        open={adding}
        onClose={() => setAdding(false)}
        people={people}
        code={household.code}
      />

      <Dialog open={removing !== null} onClose={() => setRemoving(null)}>
        <span className="dialog-icon">
          <Icon name="trash" size={22} />
        </span>
        <h2 className="dialog-title">¿Quitar a «{removing?.name}»?</h2>
        <p className="dialog-text">
          Se quitará del hogar y el reparto se recalcula al instante.
        </p>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            Cancelar
          </Button>
          <Button
            variant="coral"
            onClick={async () => {
              const target = removing;
              setRemoving(null);
              if (target) await removeMember(target.id);
            }}
          >
            Quitar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function AddPersonSheet({
  open,
  onClose,
  people,
  code
}: {
  open: boolean;
  onClose: () => void;
  people: Person[];
  code: string;
}) {
  const navigate = useNavigate();
  const { addMember, isSaving } = useMemberActions();
  const [mode, setMode] = useState<null | "code" | "name">(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const close = () => {
    setMode(null);
    setName("");
    setError(null);
    onClose();
  };

  async function onAdd() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Escribe su nombre.");
      return;
    }
    try {
      await addMember({ name: name.trim(), color: nextColor(people) });
      close();
    } catch {
      setError("No pudimos agregar a esa persona.");
    }
  }

  return (
    <Sheet open={open} onClose={close} title="Agregar persona">
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
        <>
          <div className="invite-code-card">
            <span className="invite-code-label">Código del hogar</span>
            <span className="invite-code">{code}</span>
            <div className="invite-code-actions">
              <Button
                variant="ghost"
                className="btn--sm"
                icon={<Icon name="copy" size={16} />}
                onClick={async () => {
                  await copyText(code);
                  setToast("Código copiado");
                }}
              >
                Copiar
              </Button>
              <a
                className="btn btn--whatsapp btn--sm"
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Únete a mi hogar en Nido con este código: ${code}`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="whatsapp" size={16} />
                WhatsApp
              </a>
            </div>
          </div>
          <Button block variant="ghost" onClick={() => navigate("/invitar")}>
            Ver pantalla de invitación
          </Button>
        </>
      ) : null}

      {mode === "name" ? (
        <>
          <Field label="Nombre" value={name} onChange={setName} />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <Button block onClick={onAdd} disabled={isSaving}>
            {isSaving ? "Agregando…" : "Agregar"}
          </Button>
        </>
      ) : null}

      <Button variant="ghost" block onClick={close}>
        Cancelar
      </Button>

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </Sheet>
  );
}
