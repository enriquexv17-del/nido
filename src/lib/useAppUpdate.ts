import { useCallback, useEffect, useRef, useState } from "react";
import { APP_VERSION } from "./appInfo";
import { getPlatform, type Platform } from "./platform";
import { usePwaNeedRefresh } from "./pwa";
import {
  APK_URL,
  checkDesktopUpdate,
  compareVersions,
  fetchLatest,
  getInstalledVersion,
  openDownload,
  relaunchApp,
  type DesktopUpdate
} from "./updater";

export { compareVersions };

export interface AppUpdate {
  installed: string;
  latest: string;
  notes: string[];
  hasUpdate: boolean;
  /** `true` cuando el service worker tiene una versión nueva esperando (solo web). */
  pending: boolean;
  checking: boolean;
  checkedAt: Date | null;
  platform: Platform;
  /**
   * Progreso real 0-100 cuando la plataforma lo informa (Windows). En web y
   * Android es `null`: la pantalla decide cómo mostrarlo.
   */
  progress: number | null;
  /** `true` mientras se descarga el paquete (Windows). */
  downloading: boolean;
  /** `true` mientras se instala o se abre la descarga. */
  applying: boolean;
  /** Texto de ayuda bajo el botón, según la plataforma. */
  hint: string;
  error: string | null;
  /** Acción principal: instalar (web/Windows) o abrir la descarga (Android). */
  run: () => void;
  /** Vuelve a comprobar si hay una versión nueva. */
  check: () => void;
}

const HINTS: Record<Platform, string> = {
  web: "La app te avisa sola cada vez que sale una versión.",
  android: "En Android, la actualización se instala manualmente desde el archivo que se descarga.",
  desktop: "Nido se actualiza sola; solo tienes que confirmar el reinicio."
};

/**
 * Estado de actualización según la plataforma:
 *
 * - **web/PWA:** compara la versión instalada con `version.json` y escucha al
 *   service worker; el botón recarga con la versión nueva.
 * - **Android:** lee `latest.json` de la última release de GitHub y ofrece
 *   abrir la descarga del APK (se instala a mano).
 * - **Windows (Electron):** usa `electron-updater` a través del puente seguro
 *   `window.nido` (comprobar, descargar, instalar) y reinicia la app.
 */
export function useAppUpdate(): AppUpdate {
  const platform = getPlatform();
  const pending = usePwaNeedRefresh();

  const [installed, setInstalled] = useState(APP_VERSION);
  const [latest, setLatest] = useState(APP_VERSION);
  const [notes, setNotes] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const desktop = useRef<DesktopUpdate | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const check = useCallback(() => {
    setChecking(true);
    setError(null);
    void (async () => {
      try {
        const version = await getInstalledVersion(platform);
        if (!alive.current) return;
        setInstalled(version);

        if (platform === "desktop") {
          const update = await checkDesktopUpdate();
          if (!alive.current) return;
          desktop.current = update;
          if (!update) {
            setLatest(version);
            setNotes([]);
            setProgress(null);
            return;
          }
          setLatest(update.version);
          setNotes(update.notes);
          setProgress(0);
          setDownloading(true);
          update
            .download((percent) => {
              if (alive.current) setProgress(percent);
            })
            .catch((e: unknown) => {
              if (alive.current) {
                setError(e instanceof Error ? e.message : "no se pudo descargar");
              }
            })
            .finally(() => {
              if (alive.current) setDownloading(false);
            });
        } else {
          const info = await fetchLatest(platform);
          if (!alive.current) return;
          setLatest(info.version);
          setNotes(info.notes);
        }
      } catch (e: unknown) {
        if (alive.current) {
          setError(e instanceof Error ? e.message : "sin conexión");
        }
      } finally {
        if (alive.current) {
          setChecking(false);
          setCheckedAt(new Date());
        }
      }
    })();
  }, [platform]);

  useEffect(() => {
    check();
  }, [check]);

  const run = useCallback(() => {
    void (async () => {
      if (platform === "android") {
        setApplying(true);
        await openDownload(APK_URL);
        if (alive.current) setApplying(false);
        return;
      }
      if (platform === "desktop") {
        const update = desktop.current;
        if (!update) return;
        setApplying(true);
        try {
          await update.install();
          // En Windows `install` cierra la app; si sigue viva, reiniciamos.
          await relaunchApp();
        } catch (e: unknown) {
          if (alive.current) {
            setApplying(false);
            setError(e instanceof Error ? e.message : "no se pudo instalar");
          }
        }
        return;
      }
      setApplying(true);
      // Web: activa el service worker nuevo y recarga.
      const { applyUpdate } = await import("./pwa");
      await applyUpdate();
    })();
  }, [platform]);

  const newer = compareVersions(latest, installed) > 0;

  return {
    installed,
    latest,
    notes,
    hasUpdate: newer || pending,
    pending,
    checking,
    checkedAt,
    platform,
    progress: platform === "desktop" ? progress : null,
    downloading,
    applying,
    hint: HINTS[platform],
    error,
    run,
    check
  };
}
