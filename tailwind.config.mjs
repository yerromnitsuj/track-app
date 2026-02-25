/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fde6e6',
          200: '#fbbfc0',
          300: '#f79395',
          400: '#f15c5f',
          500: '#EB0017',
          600: '#d00015',
          700: '#b00012',
          800: '#90000f',
          900: '#70000c',
        },
        teal: {
          50: '#f0f9fa',
          100: '#d8f0f3',
          200: '#b0e1e7',
          300: '#7accd6',
          400: '#3db4c1',
          500: '#007585',
          600: '#006574',
          700: '#005563',
          800: '#004552',
          900: '#003541',
        },
        dark: {
          DEFAULT: '#464535',
          light: '#5a5948',
          lighter: '#6e6d5b',
        },
      },
    },
  },
  plugins: [],
};
