import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { currentMonth } from "../lib/month";
import { AuthProvider, useAuth } from "./auth";
import { isSupabaseConfigured, supabase } from "./supabase";
import { mockStore } from "./mock.dev";

/** Mes que se muestra por defecto (coincide con la Fase 1). */
export const DEFAULT_MONTH = isSupabaseConfigured ? currentMonth() : "2026-11";

interface DataValue {
  month: string;
  setMonth: (month: string) => void;
}

const DataContext = createContext<DataValue | null>(null);

function DataProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const value = useMemo(() => ({ month, setMonth }), [month]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/**
 * Suscripción en tiempo real. Con Supabase escucha los cambios de la base;
 * en modo prueba escucha el almacén local (y otras pestañas por
 * `BroadcastChannel`).
 */
export function useRealtime(onChange: () => void) {
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel("nido-realtime")
        .on("postgres_changes", { event: "*", schema: "public" }, () => onChange())
        .subscribe();
      return () => {
        supabase!.removeChannel(channel);
      };
    }
    return mockStore().subscribe(onChange);
  }, [onChange]);
}

export function NidoProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            gcTime: 5 * 60_000,
            retry: 2,
            refetchOnWindowFocus: true
          }
        }
      })
  );

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <DataProvider>{children}</DataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function useDataContext(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataContext debe usarse dentro de <NidoProvider>");
  return ctx;
}

export { useAuth };
