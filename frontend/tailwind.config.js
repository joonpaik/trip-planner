/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },

  theme: {
    extend: {
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-delay-1': 'fadeInUp 0.5s ease-out 0.1s forwards',
        'fade-in-delay-2': 'fadeInUp 0.5s ease-out 0.2s forwards',
        'fade-in-delay-3': 'fadeInUp 0.5s ease-out 0.3s forwards',
        'fade-in-delay-4': 'fadeInUp 0.5s ease-out 0.4s forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
};
