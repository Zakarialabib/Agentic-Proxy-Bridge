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
      '/api': 'http://192.168.1.12:3001',
      '/v1': 'http://192.168.1.12:3001',
      '/status': 'http://192.168.1.12:3001',
      '/dashboard': 'http://192.168.1.12:3001',
      '/models': 'http://192.168.1.12:3001',
      '/gateway': 'http://192.168.1.12:3001',
      '/observability': 'http://192.168.1.12:3001',
      '/knowledge': 'http://192.168.1.12:3001',
      '/async': 'http://192.168.1.12:3001',
      '/mcp': 'http://192.168.1.12:3001',
      '/a2a': 'http://192.168.1.12:3001',
      '/settings': 'http://192.168.1.12:3001',
      '/presets': 'http://192.168.1.12:3001',
    },
  },
})
