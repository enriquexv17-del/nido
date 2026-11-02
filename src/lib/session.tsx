import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useDerived, type Person, type PersonId } from "../data";

interface SessionValue {
  person: Person;
  people: Person[];
  setPerson: (id: PersonId) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Persona de relleno mientras llegan los datos reales. Evita pantallas en
 * blanco antes del primer resultado de la consulta (los esqueletos se encargan
 * del estado de carga en los componentes).
 */
const PLACEHOLDER: Person = {
  id: "",
  name: "",
  initial: "?",
  color: "--p1",
  gross: 0,
  afp: 0,
  isss: 0,
  isr: 0,
  afpOn: false,
  isssOn: false,
  isrOn: false,
  net: 0,
  sharePct: 0,
  shareAmount: 0,
  leftover: 0,
  shareByExpense: [],
  memberStatus: "",
  memberTag: "",
  role: "member",
  position: 1
};

/**
 * La persona «tú» sale de la capa de datos (la que tenga tu `user_id`). El
 * cambio «Ver como» del modo desarrollador (`?dev=1`) solo se usa para
 * capturas y pruebas.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { data } = useDerived();
  const [viewAs, setViewAs] = useState<PersonId | null>(null);

  const value = useMemo<SessionValue>(() => {
    const people = data?.people ?? [];
    const person =
      people.find((p) => p.id === viewAs) ??
      people.find((p) => p.isYou) ??
      people[0] ??
      PLACEHOLDER;
    return {
      person,
      people,
      setPerson: (id: PersonId) => setViewAs(id)
    };
  }, [data, viewAs]);

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
