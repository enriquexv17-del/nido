import { useDevMode, useSession } from "../lib/session";
import { resetDemoData } from "../data";

export function DevSwitcher() {
  const dev = useDevMode();
  const { person, people, setPerson } = useSession();
  if (!dev) return null;

  return (
    <div className="dev-switcher">
      <span className="dev-switcher-label">Ver como</span>
      <div className="dev-switcher-opts">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`chip${p.id === person.id ? " is-active" : ""}`}
            onClick={() => setPerson(p.id)}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          onClick={() => {
            resetDemoData();
            window.location.reload();
          }}
        >
          Restaurar ejemplo
        </button>
      </div>
    </div>
  );
}
