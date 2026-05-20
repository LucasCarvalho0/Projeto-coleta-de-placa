/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      colors: {
        brand: {
          blue: '#2563eb',
          green: '#16a34a',
          red: '#dc2626',
          yellow: '#facc15',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)', backgroundColor: 'rgba(37, 99, 235, 0.2)' },
          '100%': { opacity: '1', transform: 'translateY(0)', backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
};
