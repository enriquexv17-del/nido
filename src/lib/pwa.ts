/**
 * Aplica la actualización de la app (PWA). Si hay un service worker esperando,
 * le pide que tome el control y recarga; si no, recarga directamente. Así la
 * pantalla de Actualizaciones puede «instalar» de verdad.
 */
export async function applyUpdate(): Promise<void> {
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
