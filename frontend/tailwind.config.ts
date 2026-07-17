import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        x: {
          black: '#000000',
          surface: '#202327',
          border: '#2f3336',
          hover: 'rgba(255, 255, 255, 0.03)',
          text: '#e7e9ea',
          'text-secondary': '#71767b',
          blue: '#1d9bf0',
          'blue-hover': '#1a8cd8',
          'blue-bg': 'rgba(29, 155, 240, 0.1)',
          like: '#f91880',
          'like-bg': 'rgba(249, 24, 128, 0.1)',
          green: '#00ba7c',
          'green-bg': 'rgba(0, 186, 124, 0.1)',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-geist-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
export default config;
