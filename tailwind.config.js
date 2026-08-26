/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0B0F1A',
          900: '#111827',
          800: '#1B2333',
          700: '#2A3346',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#5B5FEF',
          600: '#4640DE',
          700: '#3730B0',
          800: '#2C278A',
          900: '#221F66',
        },
        trail: {
          done: '#14B88A',
          current: '#F5A524',
          pending: '#94A3B8',
          late: '#EF4548',
        },
      },
      boxShadow: {
        soft: '0 2px 8px rgba(17, 24, 39, 0.06)',
        card: '0 1px 2px rgba(17,24,39,0.04), 0 8px 24px -8px rgba(17,24,39,0.10)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
