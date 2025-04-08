import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

if (import.meta.env.DEV) {
  fetch(
    "/api/method/translation_tools.www.thai_translation_dashboard.get_context_for_dev",
    {
      method: "POST",
    }
  )
    .then((response) => response.json())
    .then((values) => {
      const v = JSON.parse(values.message);
      if (!window.frappe) window.frappe = {};
      window.frappe.boot = v;
    });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
