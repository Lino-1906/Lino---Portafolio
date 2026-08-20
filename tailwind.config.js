/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './performance.js',
    './assets/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1A0F0A',
          darker: '#0D0805',
          cream: '#EDE0C8',
          creamlt: '#F5EDD9',
          brown: '#3D2314'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        editorial: ['Bebas Neue', 'sans-serif'],
        body: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
};
