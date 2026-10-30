import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: process.env.CLIENT_BASE_PATH || '/',
  server: {
    port: 58000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:58001',
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
    fs: { allow: ['../..'] },
  },
  preview: {
    port: 58000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:58001',
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: { chunkSizeWarningLimit: 1600 },
})
