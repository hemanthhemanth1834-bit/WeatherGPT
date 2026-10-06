import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react/") || id.includes("/react-dom/")) return "react";
          if (id.includes("/leaflet/")) return "maps";
          if (id.includes("/three/") || id.includes("/topojson-client/")) return "three";
          if (id.includes("/react-markdown/") || id.includes("/remark-gfm/")) return "markdown";
        }
      }
    }
  },
})
