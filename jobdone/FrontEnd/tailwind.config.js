// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  // This line is the entire solution, exactly as shown in the documentation.
  darkMode: 'class',

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        
        'dark-sidebar-gradient': 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)',
      },
      colors: {
        'dark-sidebar-accent': '#2dd4bf',
        'dark-sidebar-active': '#145350',
        'dark-sidebar': '#1a202c',
        'dark-surface': '#2d3748',
        'dark-border': '#4a5568',
        'dark-text-primary': '#edf2f7',
        'dark-text-secondary': '#a0aec0',
      }
    }
  },
  plugins: [],
}