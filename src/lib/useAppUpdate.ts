import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { APP_VERSION } from "./appInfo";
import { usePwaNeedRefresh } from "./pwa";

interface VersionFile {
  version: string;
  notes?: string[];
}

/** Compara «1.2.3»: devuelve > 0 si `a` es más nueva que `b`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

async function fetchVersionFile(): Promise<VersionFile> {
  const res = await fetch("version.json", { cache: "no-store" });
  if (!res.ok) throw new Error("sin version.json");
  const data = (await res.json()) as VersionFile;
  if (!data || typeof data.version !== "string") throw new Error("version.json inválido");
  return data;
}

export interface AppUpdate {
  installed: string;
  latest: string;
  notes: string[];
  hasUpdate: boolean;
  /** `true` cuando el service worker tiene una versión nueva esperando. */
  pending: boolean;
  checking: boolean;
  checkedAt: Date | null;
  check: () => void;
}

/**
 * Estado de actualización: compara la versión instalada (package.json) con la
 * publicada (version.json) y escucha al service worker. `hasUpdate` es `true`
 * si hay una versión nueva publicada o un service worker esperando.
 */
export function useAppUpdate(): AppUpdate {
  const { data, dataUpdatedAt, isFetching, refetch } = useQuery({
    queryKey: ["app-version"],
    queryFn: fetchVersionFile,
    staleTime: 5 * 60_000,
    retry: 1
  });

  const check = useCallback(() => {
    void refetch();
  }, [refetch]);

  const pending = usePwaNeedRefresh();
  const latest = data?.version ?? APP_VERSION;
  const newer = compareVersions(latest, APP_VERSION) > 0;

  return {
    installed: APP_VERSION,
    latest,
    notes: data?.notes ?? [],
    hasUpdate: newer || pending,
    pending,
    checking: isFetching,
    checkedAt: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    check
  };
}
