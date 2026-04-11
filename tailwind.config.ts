import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  safelist: [
    'bg-surface', 'bg-surface-1', 'bg-surface-2', 'bg-surface-3', 'bg-surface-4', 'bg-surface-5',
    'border-border', 'border-border-strong',
    'text-text-primary', 'text-text-secondary', 'text-text-tertiary', 'text-text-dim',
    'text-accent', 'text-accent-blue', 'text-accent-amber', 'text-accent-red', 'text-accent-purple',
    'bg-accent', 'bg-accent-blue', 'bg-accent-amber', 'bg-accent-red', 'bg-accent-purple',
    'bg-accent/10', 'bg-accent-red/10', 'bg-accent-blue/10', 'bg-accent-amber/10',
    'border-accent', 'border-accent-blue', 'border-accent-amber', 'border-accent-red',
    'hover:bg-surface-3', 'hover:bg-surface-4', 'hover:text-text-primary', 'hover:text-text-secondary',
    'hover:border-border-strong', 'hover:text-accent-red',
    'group-hover:opacity-100', 'group-hover:text-text-primary',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#3a3a3a',
          1: '#3f3f3f',
          2: '#444444',
          3: '#4e4e4e',
          4: '#585858',
          5: '#626262',
        },
        border: {
          DEFAULT: '#525252',
          subtle: '#484848',
          strong: '#626262',
        },
        text: {
          primary: '#f0f0f0',
          secondary: '#c0c0c0',
          tertiary: '#909090',
          dim: '#686868',
        },
        accent: {
          DEFAULT: '#3ddc84',
          blue: '#4d9fff',
          amber: '#f5a623',
          red: '#ff6b6b',
          purple: '#9d7cf4',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.2)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
export default config
