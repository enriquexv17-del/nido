import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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

/**
 * Refuerzo de sincronización. Aunque Realtime no falle, la app vuelve a pedir
 * los datos al volver a primer plano, al recuperar la conexión y cada minuto
 * (red de seguridad para cuando el móvil estuvo suspendido o sin red).
 */
function RealtimeRefuerzo() {
  const client = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const refrescar = () => {
      void client.invalidateQueries();
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", refrescar);
    const id = window.setInterval(refrescar, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", refrescar);
      window.clearInterval(id);
    };
  }, [client]);
  return null;
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
        <DataProvider>
          <RealtimeRefuerzo />
          {children}
        </DataProvider>
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
