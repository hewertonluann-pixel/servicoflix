import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0f0a',
        surface: '#141a14',
        'surface-hover': '#1a231a',
        primary: '#10b981',
        'primary-dark': '#059669',
        muted: '#94a3b8',
        border: '#1e3a2a',
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
} satisfies Config
