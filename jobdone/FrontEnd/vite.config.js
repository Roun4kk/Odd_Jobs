import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  base: "/",
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    host: true, // or use '0.0.0.0'
    port: 5173  // or whatever port you use
  }
})
