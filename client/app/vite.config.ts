import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true,
    proxy: {
      '/api/': {
        target: 'http://localhost:3000',
        secure: false,
      },
    },
    hmr: {
      overlay: true,
    },
  },
})
