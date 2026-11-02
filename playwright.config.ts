import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    headless: true,
    baseURL: "http://localhost:4173"
  },
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    { name: "movil", use: { viewport: { width: 390, height: 844 } } },
    { name: "pc", use: { viewport: { width: 1280, height: 800 } } }
  ]
});
