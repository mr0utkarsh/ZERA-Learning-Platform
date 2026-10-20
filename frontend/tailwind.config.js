/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#070711',
          1: '#0A0A18',
          2: '#0E0E20',
          3: '#12122A',
        },
        surface: {
          1: '#11111D',
          2: '#16162E',
          3: '#1B1B38',
        },
        fg: {
          DEFAULT: '#F5F4F8',
          muted: '#A8A6B5',
          dim: '#6E6C85',
        },
        muted: '#A8A6B5',
        violet: {
          500: '#755CFF',
          600: '#6A4FFF',
        },
        fuchsia: {
          400: '#B45DFF',
          500: '#A04DFF',
        },
        cyan: {
          400: '#19C7D7',
          500: '#0DB8C4',
        },
        success: {
          DEFAULT: '#3DDC84',
          600: '#2EAF6A',
        },
        warning: {
          DEFAULT: '#F5B54A',
          600: '#D99A2E',
        },
        error: {
          DEFAULT: '#FF6B6B',
          600: '#E05555',
        },
      },
      fontFamily: {
        display: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-violet': '0 0 40px -10px rgba(117, 92, 255, 0.5)',
        'glow-cyan': '0 0 40px -10px rgba(25, 199, 215, 0.4)',
        'card': '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px -16px rgba(0,0,0,0.6)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};