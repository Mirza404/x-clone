import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        foreground: 'var(--color-text)',

        // semantic (prefer these in new/edited code)
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        input: 'var(--color-input)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        content: 'var(--color-text)',
        muted: 'var(--color-text-secondary)',
        hover: 'var(--color-hover)',
        btn: {
          DEFAULT: 'var(--color-btn)',
          hover: 'var(--color-btn-hover)',
          fg: 'var(--color-btn-fg)',
        },

        // brand (theme-independent)
        primary: '#1d9bf0',
        'primary-hover': '#1a8cd8',
        'primary-bg': 'rgba(29,155,240,0.1)',
        like: '#f91880',
        'like-bg': 'rgba(249,24,128,0.1)',
        repost: '#00ba7c',
        'repost-bg': 'rgba(0,186,124,0.1)',

        // existing tokens repointed to variables (back-compat)
        x: {
          black: 'var(--color-bg)',
          surface: 'var(--color-input)',
          border: 'var(--color-border)',
          hover: 'var(--color-hover)',
          text: 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
          blue: '#1d9bf0',
          'blue-hover': '#1a8cd8',
          'blue-bg': 'rgba(29,155,240,0.1)',
          like: '#f91880',
          'like-bg': 'rgba(249,24,128,0.1)',
          green: '#00ba7c',
          'green-bg': 'rgba(0,186,124,0.1)',
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
