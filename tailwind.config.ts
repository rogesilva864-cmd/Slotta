import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          500: '#2f7dff',
          600: '#1f67ff',
          700: '#184fca',
        },
        slate: {
          950: '#071320',
        },
      },
      boxShadow: {
        soft: '0 18px 38px rgba(6, 16, 24, 0.22)',
      },
    },
  },
  plugins: [],
};

export default config;
