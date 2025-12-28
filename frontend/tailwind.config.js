/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#167dff',
          600: '#0b6ae8',
          700: '#0057d1',
        },
        dark: {
          800: '#1e1f22',
          850: '#1a1b1e',
          900: '#16171a',
          950: '#0d0e10',
        }
      },
      fontFamily: {
        sans: ['League Spartan', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'space': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'space-lg': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'space': '6px',
      }
    },
  },
  plugins: [],
}