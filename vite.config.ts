import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// `VITE_BASE` permite publicar bajo /nombre-del-repo/ en GitHub Pages.
// Por defecto usamos rutas relativas para que funcione en cualquier hosting estático.
const base = process.env.VITE_BASE ?? "./";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
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
        id: "./",
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
        start_url: "./",
        scope: "./",
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
});