import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuración de la app de Android (Capacitor).
 *
 * - `webDir: "dist"`: la app lleva su propia copia compilada de la web, no
 *   apunta a un servidor. Por eso **no** hay `server.url`, y abre sin internet
 *   con los datos ya guardados.
 * - Los colores y el tema viven en `android/app/src/main/res` (ver
 *   `docs/NATIVO.md`).
 */
const config: CapacitorConfig = {
  appId: "com.nido.app",
  appName: "Nido",
  webDir: "dist",
  backgroundColor: "#F3F4FA",
  android: {
    // Sigue el tema del sistema en la barra de estado y navegación.
    adjustMarginsForEdgeToEdge: "auto"
  }
};

export default config;
