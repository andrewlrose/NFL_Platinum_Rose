import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 🚀 THIS IS THE MISSING KEY
  base: '/platinum-rose-app/', 

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})