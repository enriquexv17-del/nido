/**
 * Puente seguro entre la web y el proceso principal de Electron.
 *
 * Con `contextIsolation: true` la web no ve Node: solo estas funciones, que el
 * código detecta como `window.nido` (`src/lib/platform.ts`). No expone nada que
 * permita ejecutar código ni leer archivos.
 */
const { contextBridge, ipcRenderer } = require("electron");

/** Suscribe un manejador y devuelve la función para quitarlo. */
function on(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("nido", {
  isElectron: true,
  appVersion: () => ipcRenderer.invoke("nido:get-version"),
  openExternal: (url) => ipcRenderer.invoke("nido:open-external", url),
  onAuthCallback: (callback) => on("nido:auth-callback", callback),
  checkForUpdates: () => ipcRenderer.invoke("nido:update-check"),
  downloadUpdate: () => ipcRenderer.invoke("nido:update-download"),
  installUpdate: () => ipcRenderer.invoke("nido:update-install"),
  onUpdateProgress: (callback) => on("nido:update-progress", callback),
  relaunch: () => ipcRenderer.invoke("nido:relaunch")
});
