/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f7f2ea',
        'paper-dark': '#efe9e0',
        ink: '#2a2416',
        'ink-light': '#6b5f52',
        'ink-muted': '#9b8f87',
        divider: '#e0d9d0',
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
