import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

/** Modo de apariencia elegido por la persona. */
export type ThemeMode = "light" | "dark" | "auto";

/** Colores de acento disponibles (se aplican con variables CSS). */
export type AccentId = "indigo" | "green" | "pink" | "orange" | "teal" | "purple";

export const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "auto", label: "Automático" }
];

/** Muestras de color para la pantalla de apariencia. */
export const ACCENTS: { id: AccentId; label: string; color: string }[] = [
  { id: "indigo", label: "Índigo", color: "#2f3fa0" },
  { id: "green", label: "Verde", color: "#0e9f6e" },
  { id: "pink", label: "Rosa", color: "#db2777" },
  { id: "orange", label: "Naranja", color: "#ea6a12" },
  { id: "teal", label: "Turquesa", color: "#0d9488" },
  { id: "purple", label: "Morado", color: "#7c3aed" }
];

const ACCENT_IDS = ACCENTS.map((a) => a.id);
const MODE_KEY = "nido.theme.mode";
const ACCENT_KEY = "nido.theme.accent";

interface ThemeValue {
  /** Preferencia elegida («auto» sigue al sistema). */
  mode: ThemeMode;
  /** Acento elegido. */
  accent: AccentId;
  /** Tema realmente aplicado: «auto» resuelto a claro u oscuro. */
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentId) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function readMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === "light" || raw === "dark" || raw === "auto") return raw;
  } catch {
    /* localStorage puede no estar disponible */
  }
  return "auto";
}

function readAccent(): AccentId {
  try {
    const raw = localStorage.getItem(ACCENT_KEY) as AccentId | null;
    if (raw && ACCENT_IDS.includes(raw)) return raw;
  } catch {
    /* localStorage puede no estar disponible */
  }
  return "indigo";
}

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/**
 * Apariencia de Nido (Fase 4). El modo y el color de acento son una preferencia
 * **del dispositivo**: viven en `localStorage` y se aplican como `data-theme` y
 * `data-accent` en `<html>`, donde el CSS los lee.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [accent, setAccentState] = useState<AccentId>(readAccent);
  const [systemDark, setSystemDark] = useState(prefersDark);

  // «Automático» sigue los cambios del sistema en caliente.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" =
    mode === "auto" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.accent = accent;
    root.style.colorScheme = resolved;
  }, [resolved, accent]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* noop */
    }
  }, []);

  const setAccent = useCallback((next: AccentId) => {
    setAccentState(next);
    try {
      localStorage.setItem(ACCENT_KEY, next);
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo(
    () => ({ mode, accent, resolved, setMode, setAccent }),
    [mode, accent, resolved, setMode, setAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
