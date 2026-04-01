import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
   base: '/erp/',   // ✅ ADD THIS
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/erp/api': {
        // target: 'http://localhost:3000',
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), tailwindcss()],
})
