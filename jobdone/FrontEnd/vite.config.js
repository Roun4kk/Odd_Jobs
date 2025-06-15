import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy:{
      "/user": {
        target: "https://jobdone-zh3o.onrender.com",
        changeOrigin: true,
        secure: false,
      },
      "/posts": {
        target: "https://jobdone-zh3o.onrender.com",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "https://jobdone-zh3o.onrender.com",
        changeOrigin: true,
        secure: false,
      },
      "/conversations": {
        target: "https://jobdone-zh3o.onrender.com",
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: "https://jobdone-zh3o.onrender.com",
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
