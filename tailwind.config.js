/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#f59e0b', // Amber
          dark: '#b45309',
        },
        background: {
          dark: '#080e1a',
        },
        surface: {
          dark: 'rgba(255, 255, 255, 0.05)',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
