import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'axios',
    ],
  },
  // Bagian BARU yang ditambahkan untuk membantu Vite mentransformasi dependensi CJS
  build: {
    commonjsOptions: {
      include: [/node_modules/], // Proses semua modul CJS di node_modules
    },
  },
})