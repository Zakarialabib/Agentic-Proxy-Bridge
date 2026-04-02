import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/v1': 'http://localhost:8000',
      '/status': 'http://localhost:8000',
      '/dashboard': 'http://localhost:8000',
      '/models': 'http://localhost:8000',
      '/gateway': 'http://localhost:8000',
      '/observability': 'http://localhost:8000',
      '/knowledge': 'http://localhost:8000',
      '/async': 'http://localhost:8000',
      '/mcp': 'http://localhost:8000',
      '/a2a': 'http://localhost:8000',
      '/settings': 'http://localhost:8000',
      '/presets': 'http://localhost:8000',
    },
  },
})
