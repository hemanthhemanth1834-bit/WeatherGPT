import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/cinematic-upgrade.css";
import App from "./App.jsx";
import { recordEvent } from "./services/privacyAnalytics";

recordEvent("app_loaded");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
