import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/screens.css";
import "./styles/motion.css";

import { MotionRoot } from "./motion";
import { ThemeProvider } from "./lib/theme";
import { initPWA } from "./lib/pwa";
import App from "./App";

// Bloquea el zoom accidental por doble toque (iOS).
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false }
);

initPWA();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <MotionRoot>
        <App />
      </MotionRoot>
    </ThemeProvider>
  </StrictMode>
);
