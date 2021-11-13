module.exports = {
  purge: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    fontFamily: {
      sat8x8: '"ToshibaSat 8x8"',
      sat8x14: '"ToshibaSat 8x14"',
      sat8x16: '"ToshibaSat 8x16"',
    },
    fontSize: {
      half: '0.5rem',
      double: '2rem',
      triple: '3rem',
      xs: '.75rem',
      sm: '.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
      '7xl': '4.5rem',
      '8xl': '6rem',
      '9xl': '8rem',
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
