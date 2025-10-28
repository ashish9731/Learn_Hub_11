/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom colors for dark theme
        primary: '#a855f7',
        secondary: '#9333ea',
        background: {
          primary: '#121212',
          secondary: '#1e1e1e',
          tertiary: '#252525',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a0a0',
        },
        border: '#333333',
      }
    },
  },
  plugins: [
    function({ addBase }) {
      addBase({
        'input, textarea, select': {
          '@apply text-gray-900 dark:text-white': {}
        },
        '.dark input, .dark textarea, .dark select': {
          '@apply text-white bg-[#252525] border-[#333333]': {}
        }
      })
    }
  ],
};