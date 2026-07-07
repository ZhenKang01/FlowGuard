import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/chat-api': {
        target: 'https://n8ngc.codeblazar.org',
        changeOrigin: true,
        secure: false, // Bypasses SSL certificate issues
        rewrite: (path) => path.replace(/^\/chat-api/, '')
      }
    }
  }
})
