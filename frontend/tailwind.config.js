/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0A0F1D',
          900: '#0D1527',
          800: '#151F33',
          700: '#1E2E4A',
        }
      }
    },
  },
  plugins: [],
}
