/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#7a1330',
          dark: '#54001c',
          light: '#a83250',
        },
        gold: '#d9a017',
        green: '#3f7d3a',
        cream: '#faf6ee',
        paper: '#ffffff',
        line: '#d9cfc2',
        ink: '#3a2c2c',
        muted: '#8a7a72',
      }
    },
  },
  plugins: [],
}