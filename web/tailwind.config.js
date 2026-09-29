/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#070512',
          900: '#0c091d',
          850: '#110e28',
          800: '#171336',
          700: '#221b4f',
          600: '#31276d',
        },
        gold: {
          300: '#ffeb99',
          400: '#fbd44c',
          500: '#f5c842',
          600: '#e5b323',
          700: '#c29013',
        },
        magic: {
          purple: '#8b5cf6',
          violet: '#7c3aed',
          glow: '#a855f7',
        },
      },
      fontFamily: {
        rubik: ['Rubik', 'sans-serif'],
        cinzel: ['Cinzel', 'serif'],
        alef: ['Alef', 'sans-serif'],
      },
      boxShadow: {
        magical: '0 0 25px -5px rgba(139, 92, 246, 0.35)',
        gold: '0 0 25px -5px rgba(245, 200, 66, 0.35)',
        glow: '0 0 15px rgba(168, 85, 247, 0.4)',
      },
    },
  },
  plugins: [],
};
