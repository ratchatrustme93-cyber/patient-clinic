/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Light medical palette — calm teal/blue clinical tone
        brand: {
          50: '#eff9f9',
          100: '#d6efef',
          200: '#aee0e0',
          300: '#78cccc',
          400: '#43b1b1',
          500: '#2b9797',
          600: '#237a7b',
          700: '#206263',
          800: '#1e4f51',
          900: '#1c4244',
        },
      },
    },
  },
  plugins: [],
}
