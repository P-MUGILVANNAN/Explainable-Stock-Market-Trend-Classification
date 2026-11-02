/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        finance: {
          dark: '#0B0F19',
          card: '#111827',
          surface: '#1E293B',
          border: '#334155',
          green: '#10B981',
          red: '#EF4444',
          blue: '#3B82F6',
          amber: '#F59E0B'
        }
      }
    },
  },
  plugins: [],
}

