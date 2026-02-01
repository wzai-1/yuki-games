import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this project under /yuki-games/
  base: '/yuki-games/',
  build: {
    outDir: 'dist',
  },
})
