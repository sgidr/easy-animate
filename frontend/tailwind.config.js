/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          dark: '#4f46e5'
        },
        accent: {
          DEFAULT: '#22d3ee',
          hover: '#67e8f9'
        },
        dark: {
          DEFAULT: '#0f172a',
          100: '#1e293b',
          200: '#334155',
          300: '#475569',
          400: '#64748b'
        }
      }
    },
  },
  plugins: [],
}
