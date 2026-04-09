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
      '/api': 'http://127.0.0.1:3001',
      '/v1': 'http://127.0.0.1:3001',
      '/status': 'http://127.0.0.1:3001',
      '/dashboard': 'http://127.0.0.1:3001',
      '/models': 'http://127.0.0.1:3001',
      '/gateway': 'http://127.0.0.1:3001',
      '/observability': 'http://127.0.0.1:3001',
      '/knowledge': 'http://127.0.0.1:3001',
      '/async': 'http://127.0.0.1:3001',
      '/mcp': 'http://127.0.0.1:3001',
      '/a2a': 'http://127.0.0.1:3001',
      '/settings': 'http://127.0.0.1:3001',
      '/presets': 'http://127.0.0.1:3001',
      '/tools': 'http://127.0.0.1:3001',
      '/retrieval': 'http://127.0.0.1:3001',
    },
  },
})
