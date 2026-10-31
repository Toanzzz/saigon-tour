import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  base: process.env.CLIENT_BASE_PATH || '/',
  server: {
    port: 58000,
    strictPort: true,
    proxy: {
      '/api': {
        ws: true,
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
        ws: true,
        target: 'http://127.0.0.1:58001',
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: { chunkSizeWarningLimit: 1600 },
  ssr: { resolve: { mainFields: ['module', 'main'] } },
  test: {
    server: {
      deps: { inline: [/@pmndrs\/xr/, /@react-three\/xr/, /meshline/] },
    },
  },
})
