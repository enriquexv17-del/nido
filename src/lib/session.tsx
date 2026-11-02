import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { MOCK, type Person, type PersonId } from "../data/mock";

interface SessionValue {
  person: Person;
  people: Person[];
  setPerson: (id: PersonId) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentId, setCurrentId] = useState<PersonId>("enrique");

  const value = useMemo<SessionValue>(() => {
    const person = MOCK.people.find((p) => p.id === currentId) ?? MOCK.people[0];
    return {
      person,
      people: MOCK.people,
      setPerson: (id: PersonId) => setCurrentId(id)
    };
  }, [currentId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}

/** Modo desarrollador: solo se activa con ?dev=1 en la URL. */
export function useDevMode(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const hashQuery = window.location.hash.includes("?")
      ? window.location.hash.slice(window.location.hash.indexOf("?") + 1)
      : "";
    const hashParams = new URLSearchParams(hashQuery);
    return params.get("dev") === "1" || hashParams.get("dev") === "1";
  }, []);
}

/** Copia texto al portapapeles con respaldo para navegadores sin permiso. */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  }
}
