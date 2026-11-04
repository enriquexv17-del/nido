import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Destino de la compilación:
 *   VITE_TARGET = web (por defecto) | android | desktop
 *
 * La base la controla `VITE_BASE` (GitHub Pages la define con el nombre del
 * repo). Si no, la web usa `/nido/` y las apps nativas `./` (rutas relativas
 * que funcionan dentro de Capacitor `capacitor://localhost` y Electron).
 */
type Target = "web" | "android" | "desktop";

/** Ruta pública de GitHub Pages. */
const WEB_BASE = "/nido/";

export default defineConfig(({ command }) => {
  const target = (process.env.VITE_TARGET as Target) ?? "web";
  const isNative = target !== "web";
  // `/nido/` es solo para el sitio publicado: dev y `vite preview` sirven en
  // la raíz (`./`) para que las pruebas y el desarrollo no cambien de ruta.
  const defaultBase =
    command === "build" && target === "web" ? WEB_BASE : "./";
  const base = process.env.VITE_BASE ?? defaultBase;

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        // La app nativa NO lleva service worker: se actualiza por su propio
        // mecanismo (APK / actualizador de Electron). El plugin se desactiva por
        // completo en los builds nativos.
        disable: isNative,
        // "prompt": la app avisa cuando hay una versión nueva y la instala desde
        // la pantalla Actualizaciones (no recarga sola a mitad de una edición).
        registerType: "prompt",
        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
        workbox: {
          // `version.json` NO se precachea: se pide siempre por red para saber
          // cuál es la última versión publicada.
          globPatterns: ["**/*.{js,css,html,svg,png,woff2,woff,ico}"],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /\/version\.json$/,
              handler: "NetworkOnly"
            }
          ]
        },
        manifest: {
          id: base,
          name: "Nido · Gastos del hogar",
          short_name: "Nido",
          description: "Sueldos y gastos del hogar, repartidos justo.",
          lang: "es-SV",
          dir: "ltr",
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          orientation: "portrait",
          theme_color: "#18205F",
          background_color: "#F3F4FA",
          start_url: base,
          scope: base,
          categories: ["finance", "productivity"],
          icons: [
            {
              src: "icons/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "icons/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "icons/maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        }
      })
    ]
  };
});
