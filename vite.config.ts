import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/my-trade-life/',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
