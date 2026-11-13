import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
import "./styles/cinematic-upgrade.css";
import "./styles/premium-imagery.css";
import "./styles/cinematic-v2.css";
import "./styles/module-cinematic.css";
import "./styles/transformation.css";
import "./styles/motion.css";
import App from "./App.jsx";
import { recordEvent } from "./services/privacyAnalytics";

recordEvent("app_loaded");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
