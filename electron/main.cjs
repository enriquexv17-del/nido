/**
 * Proceso principal de Electron (Windows).
 *
 * - Una sola instancia de la app.
 * - Ventana que carga el build `desktop` (`dist/index.html`, base `./`).
 * - `contextIsolation: true` y `nodeIntegration: false`: la web nunca toca Node.
 * - Enlaces externos y login con Google se abren en el navegador del sistema.
 * - El regreso del login usa el protocolo `nido://login-callback`, que registra
 *   el instalador NSIS; el enlace se reenvía a la ventana.
 * - Actualizaciones con `electron-updater` (proveedor GitHub), expuestas por el
 *   preload. Si no hay release legible, la app sigue mostrando «versión actual».
 *
 * No lee ni imprime secretos: la configuración pública de actualización la
 * genera `electron-builder` (app-update.yml).
 */
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

const AUTH_SCHEME = "nido";
const isDev = !app.isPackaged;

/** Crea (una vez) la ventana principal. */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 400,
    minHeight: 640,
    backgroundColor: "#F3F4FA",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  // Los enlaces externos (Google, GitHub...) se abren fuera de la app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current && /^https?:\/\//i.test(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/** Reenvía a la ventana el enlace `nido://login-callback...` con el que vuelve Google. */
function sendAuthCallback(url) {
  if (!url) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("nido:auth-callback", url);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

/** Busca el enlace propio dentro de los argumentos de arranque. */
function authUrlFromArgv(argv) {
  return argv.find((a) => typeof a === "string" && a.startsWith(`${AUTH_SCHEME}://`)) ?? null;
}

/* ------------------------------------ Arranque ------------------------------------ */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    sendAuthCallback(authUrlFromArgv(argv));
  });

  // Enlaces propios (Windows). En desarrollo, apunta al ejecutable actual.
  if (isDev) {
    app.setAsDefaultProtocolClient(AUTH_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(AUTH_SCHEME);
  }

  if (isDev && process.platform === "win32") {
    // Evita abrir una ventana de consola extra y acelera el arranque.
    app.setAppUserModelId("com.nido.app");
  }

  app.whenReady().then(() => {
    createWindow();
    sendAuthCallback(authUrlFromArgv(process.argv));

    // La ventana ya cargó: si el arranque traía un enlace, reenvíalo luego.
    if (mainWindow) {
      mainWindow.webContents.on("did-finish-load", () => {
        sendAuthCallback(authUrlFromArgv(process.argv));
      });
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

/* ------------------------------------ IPC ------------------------------------ */

ipcMain.handle("nido:get-version", () => app.getVersion());

ipcMain.handle("nido:open-external", async (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url);
  }
});

ipcMain.handle("nido:relaunch", () => {
  app.relaunch();
  app.exit(0);
});

/* ------------------------------- Actualizaciones ------------------------------- */

let autoUpdater = null;
function updater() {
  if (autoUpdater) return autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("download-progress", (p) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("nido:update-progress", Math.round(p.percent));
      }
    });
    return autoUpdater;
  } catch {
    return null;
  }
}

ipcMain.handle("nido:update-check", async () => {
  const up = updater();
  if (!up) return null;
  try {
    const result = await up.checkForUpdates();
    const info = result?.updateInfo;
    if (!info || !info.version || info.version === app.getVersion()) return null;
    const notes = Array.isArray(info.releaseNotes)
      ? info.releaseNotes.map((n) => (typeof n === "string" ? n : n?.note ?? "")).filter(Boolean)
      : typeof info.releaseNotes === "string"
        ? info.releaseNotes
        : [];
    return { version: info.version, notes };
  } catch {
    // Sin servidor de actualizaciones o sin red: «versión actual», sin romper.
    return null;
  }
});

ipcMain.handle("nido:update-download", async () => {
  const up = updater();
  if (!up) return false;
  try {
    await up.downloadUpdate();
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("nido:update-install", () => {
  const up = updater();
  if (!up) return false;
  // Cierra la app, instala y vuelve a abrir.
  setImmediate(() => up.quitAndInstall(false, true));
  return true;
});
