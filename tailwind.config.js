module.exports = {
  purge: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    fontFamily: {
      sans: ['Dongle', 'sans-serif'],
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ...require('tailwindcss/colors'),
    },
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
