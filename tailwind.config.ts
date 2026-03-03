import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#141414',
        surface: '#1f1f1f',
        'surface-hover': '#2a2a2a',
        primary: '#e50914',
        'primary-dark': '#b20710',
        muted: '#8c8c8c',
        border: '#333333',
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
} satisfies Config
