import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

type Listener = () => void;

const listeners = new Set<Listener>();

let needsRefresh = false;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

/**
 * Arranca el service worker en modo «prompt» (lo llama `main.tsx`).
 *
 * La app no se recarga sola: cuando hay una versión nueva se marca
 * `needsRefresh` y la pantalla Actualizaciones ofrece instalarla.
 */
export function initPWA(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      needsRefresh = true;
      emit();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        void registration.update().catch(() => undefined);
      };
      // Revisa si hay una versión nueva cada hora y al volver a la app.
      window.setInterval(check, 60 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    }
  });
}

/** Suscripción al estado del service worker (para `useSyncExternalStore`). */
export function subscribePWA(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pwaNeedsRefresh(): boolean {
  return needsRefresh;
}

/** `true` cuando hay un service worker nuevo esperando para activarse. */
export function usePwaNeedRefresh(): boolean {
  return useSyncExternalStore(subscribePWA, pwaNeedsRefresh, () => false);
}

/**
 * Aplica la actualización de la app (PWA) y recarga. Con
 * `registerType: "prompt"` hay que activar el service worker nuevo; si no hay
 * ninguno esperando, recarga igualmente para volver a pedir la versión.
 */
export async function applyUpdate(): Promise<void> {
  if (updateSW) {
    try {
      await updateSW(true);
      return;
    } catch {
      /* cae al método manual */
    }
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.waiting) {
      await new Promise<void>((resolve) => {
        const onChange = () => {
          navigator.serviceWorker.removeEventListener("controllerchange", onChange);
          resolve();
        };
        navigator.serviceWorker.addEventListener("controllerchange", onChange);
        reg.waiting?.postMessage({ type: "SKIP_WAITING" });
      });
    }
  } catch {
    /* sin service worker: recargamos igual */
  }
  window.location.reload();
}