/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          yellow: '#FCEE0C',
          green: 'rgb(var(--c-primary) / <alpha-value>)',
          pink: '#ff0055',
          blue: '#00B8FF',
          red: '#FF003C',
        },
        bg: {
          void: '#050505',
          panel: '#0a0a0a',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
