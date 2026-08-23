import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        '**/backend/**',
        '**/public-apis-master/**',
        '**/*.zip',
        '**/playwright-report/**',
        '**/test-results/**'
      ]
    }
  }
})
