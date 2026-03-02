import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        background: '#0F0F1A',
        surface: '#1A1A2E',
        'surface-hover': '#22223B',
        primary: '#00C896',
        'primary-dark': '#00A87E',
        accent: '#7C3AED',
        muted: '#A0A0B0',
        border: '#2A2A3E',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(to right, rgba(15,15,26,0.95) 40%, transparent 100%)',
        'gradient-card': 'linear-gradient(to top, rgba(15,15,26,1) 0%, transparent 60%)',
        'gradient-row': 'linear-gradient(to right, #0F0F1A 0%, transparent 10%, transparent 90%, #0F0F1A 100%)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-left': { from: { opacity: '0', transform: 'translateX(-20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease forwards',
        'slide-in-left': 'slide-in-left 0.5s ease forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
