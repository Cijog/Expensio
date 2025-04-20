/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}', // Ensure this includes all your .jsx files
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1a1a1a',
        'sidebar-bg': '#0d0d0d',
        'content-bg': '#1e293b',
        'purple-accent': '#7c3aed',
        'blue-accent': '#3b82f6',
        'green-accent': '#10b981',
        'red-accent': '#ef4444',
        'teal-accent': '#14b8a6',
        'pink-accent': '#ec4899',
      },
      width: {
        '15': '60px',
        '50': '200px',
      },
    },
  },
  plugins: [],
};