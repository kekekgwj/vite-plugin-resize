import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import VitePluginResize from "../../dist/index.js"
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), VitePluginResize({
    originHeight: 500,
    originWidth: 500,
    fileName: "/src/App",
  })],
})
