/**
 * Información de la versión instalada. Sale de `package.json` (una sola fuente
 * de verdad). La pantalla de Actualizaciones la compara con `public/version.json`,
 * que representa la última versión publicada.
 */
import pkg from "../../package.json";

export const APP_VERSION: string = pkg.version;
