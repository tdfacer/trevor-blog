/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0a',
          surface: '#111111',
          border: '#1a1a1a',
          green: '#00ff00',
          'green-dim': '#00cc00',
          text: '#e0e0e0',
          muted: '#808080',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 255, 0, 0.3)',
        'glow-sm': '0 0 10px rgba(0, 255, 0, 0.2)',
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#e0e0e0',
            '--tw-prose-headings': '#ffffff',
            '--tw-prose-links': '#00ff00',
            '--tw-prose-bold': '#ffffff',
            '--tw-prose-code': '#00ff00',
            '--tw-prose-pre-bg': '#111111',
            '--tw-prose-pre-code': '#e0e0e0',
            maxWidth: 'none',
            code: {
              backgroundColor: '#1a1a1a',
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            a: {
              color: '#00ff00',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            pre: {
              backgroundColor: '#111111',
              border: '1px solid #1a1a1a',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
