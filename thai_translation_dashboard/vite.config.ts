import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import proxyOptions from "./proxyOptions";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8080,
    host: "0.0.0.0",
    proxy: proxyOptions,
    allowedHosts: ["erpnext-dev.bunchee.online"],
    // allowedHosts: ["all"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../translation_tools/public/thai_translation_dashboard",
    emptyOutDir: true,
    target: "es2015",
  },
});
