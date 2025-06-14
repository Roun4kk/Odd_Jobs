import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy:{
      "/user": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/posts": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/conversations": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      }
    },
  },
  plugins: [
    tailwindcss(),
    react()
  ],
})
