/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0F',
        surface: '#12121A',
        border: '#1E1E2E',
        'accent-primary': '#E8FF00',
        'accent-secondary': '#FF3CAC',
        'accent-tertiary': '#00D4FF',
        'text-primary': '#F0F0F5',
        'text-secondary': '#8888AA',
        'text-muted': '#444455',
        success: '#00FF9D',
        error: '#FF4560',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        heading: ['"DM Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        brutal: '0px',
        pill: '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'scan-line': 'scanLine 2s linear infinite',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'grain': 'grain 0.5s steps(1) infinite',
        'typing-cursor': 'typingCursor 1s step-end infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'enter-stagger': 'enterStagger 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scanLine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.5)' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '30%': { transform: 'translate(7%, -25%)' },
          '50%': { transform: 'translate(-15%, 10%)' },
          '70%': { transform: 'translate(0%, 15%)' },
          '90%': { transform: 'translate(-10%, 10%)' },
        },
        typingCursor: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(232, 255, 0, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(232, 255, 0, 0.6)' },
        },
        enterStagger: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #0A0A0F 0%, #1A0A2E 50%, #0A1A2E 100%)',
        'gradient-card': 'linear-gradient(180deg, #12121A 0%, #0E0E16 100%)',
        'gradient-accent': 'linear-gradient(135deg, #E8FF00 0%, #00D4FF 100%)',
      },
    },
  },
  plugins: [],
}
