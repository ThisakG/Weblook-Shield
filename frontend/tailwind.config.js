/**
 * tailwind.config.js
 * ----------------------------------------------------------------------------
 * Defines the Weblook Shield RED / GRAY / WHITE theme as first-class Tailwind
 * colors, per the assignment's explicit branding requirement. Every
 * component in this app should reach for `brand-*` / `slate-*` / `white`
 * rather than Tailwind's default `blue-500`-style colors, so the whole app
 * stays visually consistent.
 * ----------------------------------------------------------------------------
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf2f2',
          100: '#fbe0e0',
          200: '#f5b8b8',
          300: '#ea8a8a',
          400: '#dc5555',
          500: '#c1272d', // primary Weblook Shield red
          600: '#a31f24',
          700: '#84181c',
          800: '#651215',
          900: '#470c0e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
