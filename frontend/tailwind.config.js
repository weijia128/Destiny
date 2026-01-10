/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 紫微主题色系
        destiny: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        cosmic: {
          dark: '#0f0a1a',
          deeper: '#1a1025',
          purple: '#2d1f4f',
          gold: '#d4af37',
          silver: '#c0c0c0',
          bronze: '#cd7f32',
        },
      },
      fontFamily: {
        display: ['Noto Serif SC', 'serif'],
        body: ['Noto Sans SC', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      backgroundImage: {
        'starfield': 'radial-gradient(ellipse at center, #1a1025 0%, #0f0a1a 100%)',
        'cosmic-glow': 'radial-gradient(circle at 50% 50%, rgba(147, 51, 234, 0.15) 0%, transparent 70%)',
        'gold-shimmer': 'linear-gradient(135deg, #d4af37 0%, #f4e5c3 50%, #d4af37 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'cosmic': '0 0 60px rgba(147, 51, 234, 0.3)',
        'gold': '0 0 30px rgba(212, 175, 55, 0.4)',
        'inner-glow': 'inset 0 0 30px rgba(147, 51, 234, 0.2)',
      },
    },
  },
  plugins: [],
}
