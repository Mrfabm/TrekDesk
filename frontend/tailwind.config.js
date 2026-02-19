/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-down': 'slide-down 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.2s ease-out forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'scale-in': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      scale: {
        '102': '1.02',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
  safelist: [
    {
      pattern: /(bg|text|border)-(blue|green|yellow|red|purple|gray|orange)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ['hover', 'group-hover'],
    },
    {
      pattern: /bg-(blue|green|yellow|red|purple|gray|orange)-50\/50/,
    },
  ],
}; 