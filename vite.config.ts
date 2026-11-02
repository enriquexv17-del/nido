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
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,ico,json}"]
      },
      manifest: {
        name: "Nido",
        short_name: "Nido",
        description: "Sueldos y gastos del hogar, repartidos justo.",
        lang: "es-SV",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#18205F",
        background_color: "#F3F4FA",
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
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
