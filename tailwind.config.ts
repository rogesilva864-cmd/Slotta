import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          400: '#4b93ff',
          500: '#2f7dff',
          600: '#1f67ff',
          700: '#184fca',
        },
        slate: {
          950: '#050d1a',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 40px rgba(2, 8, 20, 0.35)',
        glow: '0 10px 30px rgba(47, 125, 255, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
