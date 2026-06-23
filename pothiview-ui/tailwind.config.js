/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FBF8F2',
          dim: '#F2EDE2',
          dark: '#15130F',
          darkdim: '#1C1914',
        },
        ink: {
          DEFAULT: '#221E18',
          soft: '#6E6657',
          faint: '#A39C8C',
          dark: '#F3EFE4',
        },
        brand: {
          50: '#EFF6F2',
          100: '#D9EBE2',
          200: '#B3D6C6',
          300: '#85BCA5',
          400: '#549C81',
          500: '#2F7A60',
          600: '#23624D',
          700: '#1C4E3E',
          800: '#163E32',
          900: '#0F2D24',
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(34,30,24,0.04), 0 8px 24px -8px rgba(34,30,24,0.10)',
        lift: '0 4px 14px -4px rgba(34,30,24,0.18)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
}
