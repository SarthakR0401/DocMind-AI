/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      colors: {
        violet: {
          50: '#F5F0FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        ink: '#0F0A1E',
        muted: '#6B6B99',
        surface: '#FFFFFF',
        bg: '#F8F6FF',
        border: '#E4DEFF',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'grad': 'gradAnim 7s ease infinite',
        'fade-up': 'fadeUp 0.6s ease both',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease both',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradAnim: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 8px 32px rgba(91,33,182,0.32)' },
          '50%': { boxShadow: '0 8px 48px rgba(91,33,182,0.58)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'violet-sm': '0 4px 14px rgba(91,33,182,0.22)',
        'violet-md': '0 8px 30px rgba(91,33,182,0.28)',
        'violet-lg': '0 16px 48px rgba(91,33,182,0.35)',
        'card': '0 3px 16px rgba(91,33,182,0.07)',
      },
    },
  },
  plugins: [],
}
