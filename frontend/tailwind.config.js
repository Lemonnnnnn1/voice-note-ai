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
        primary: {
          DEFAULT: '#4F46E5',
          light: '#818CF8',
          dark: '#3730A3',
        },
        surface: {
          bg: '#F9FAFB',
          card: '#FFFFFF',
          sidebar: '#F3F4F6',
        },
        dark: {
          bg: '#111827',
          card: '#1F2937',
          sidebar: '#111827',
          border: '#374151',
          text: '#F9FAFB',
          'text-secondary': '#9CA3AF',
        },
        border: '#E5E7EB',
        text: {
          primary: '#111827',
          secondary: '#6B7280',
        },
        success: '#10B981',
        warning: '#F59E0B',
      },
    },
  },
  plugins: [],
}
