import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署在仓库子路径下（https://1739467001-svg.github.io/ZJGSUVisual/）
  base: '/ZJGSUVisual/',
  plugins: [react()],
})
