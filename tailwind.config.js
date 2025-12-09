/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderColor: {
        border: "hsl(var(--border))",
      },
      backgroundColor: {
        background: "hsl(var(--background))",
      },
      textColor: {
        foreground: "hsl(var(--foreground))",
      },
      animation: {
        drawLine: 'drawLine 1.5s cubic-bezier(0.8, 0, 1, 1) forwards',
        modalFadeIn: 'modalFadeIn 0.3s ease-in-out forwards',
        fadeSlideIn: 'fadeSlideIn 0.8s ease-out forwards',
        fadeSlideInRight: 'fadeSlideInRight 0.8s ease-out forwards',
        drawHorizontal: 'drawHorizontal 2.5s ease-out forwards',
        drawHorizontalRight: 'drawHorizontalRight 2.5s ease-out forwards',
        drawVertical: 'drawVertical 2.5s ease-out 2.5s forwards',
      },
      keyframes: {
        drawLine: {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
        modalFadeIn: {
          'from': { opacity: '0', transform: 'translateY(-20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeSlideIn: {
          'from': { opacity: '0', transform: 'translateX(-50px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeSlideInRight: {
          'from': { opacity: '0', transform: 'translateX(50px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        drawHorizontal: {
          '0%': { width: '0', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { width: '79%', opacity: '1' },
        },
        drawHorizontalRight: {
          '0%': { width: '0', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { width: '80%', opacity: '1' },
        },
        drawVertical: {
          '0%': { opacity: '0', transform: 'scaleY(0)' },
          '10%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'scaleY(1)' },
        },
      },
      colors: {
        'custom-bg': '#000000',
        'custom-text': '#ffffff',
        'gradient-from': '#b9258f',
        'gradient-to': '#1bf6c6',
        'line-active': '#21BE9C',
        'line-inactive': 'rgba(255, 255, 255, 0.15)',
        'line-inactive-darker': 'rgba(255, 255, 255, 0.5)',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      opacity: {
        '40': '0.4',
        '70': '0.7',
      },
      screens: {
        'xs': '320px',
        'sm': '480px',
        'md': '768px',
        'lg': '1024px',
      },
    },
  },
  plugins: [
    // require('tailwind-scrollbar-hide'), // If you want to hide scrollbars easily
  ],
}

