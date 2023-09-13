import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import inspect from "vite-plugin-inspect";
import pluginResize from "./vite-plugin-resize/src/index";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    pluginResize({
      originWidth: 800,
      originHeight: 600,
      fileName: "/src/App",
      isFullScreen: true,
    }),
    react(),
    inspect(),
  ],
});
