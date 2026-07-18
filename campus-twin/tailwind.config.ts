import type { Config } from 'tailwindcss'

// 品牌色与界面色板见规格 v3.0 §10
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0ea5a3',
          dark: '#0b7c7a',
          light: '#5eead4',
        },
        candidate: '#38bdf8',
        gold: '#f5c542',
        danger: '#ef4444',
        ink: {
          DEFAULT: '#0b1220',
          800: '#16233a',
          700: '#1a2637',
        },
        panel: '#f6f8fb',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'PingFang SC',
          'Helvetica Neue', 'Microsoft YaHei', 'Segoe UI', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config
