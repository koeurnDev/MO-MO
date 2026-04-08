/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'khmer': ['Kantumruy Pro', 'sans-serif'],
      },
      colors: {
        'primary-accent': 'var(--primary-accent)',
        'app': 'var(--bg-app)',
        'surface': 'var(--bg-surface)',
        'main': 'var(--text-main)',
        'bold': 'var(--text-bold)',
        'muted': 'var(--text-muted)',
      },
    },
  },
  plugins: [],
}
