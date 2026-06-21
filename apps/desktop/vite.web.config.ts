import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Browser-only dev server for fast UI iteration / preview without launching
 * Electron. `window.flowlm` (preload API) is absent here, so components guard it.
 */
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  resolve: {
    alias: { '@': resolve(__dirname, 'src/renderer/src') }
  },
  plugins: [react()],
  server: { port: 5199, strictPort: true }
})
