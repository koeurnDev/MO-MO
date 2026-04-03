import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true, // Needed for exposing via ngrok
    allowedHosts: ['nonstandard-ashli-pachydermatous.ngrok-free.dev'],
    proxy: {
      '/api': 'http://127.0.0.1:3000'
    }
  }
})
