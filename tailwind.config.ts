import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#0f0f0f',
          1: '#141414',
          2: '#1a1a1a',
          3: '#222222',
          4: '#2a2a2a',
        },
        border: {
          DEFAULT: '#2a2a2a',
          subtle: '#1e1e1e',
          strong: '#3a3a3a',
        },
        text: {
          primary: '#e8e8e8',
          secondary: '#888888',
          tertiary: '#555555',
          dim: '#333333',
        },
        accent: {
          DEFAULT: '#4ade80',
          blue: '#60a5fa',
          amber: '#fbbf24',
          red: '#f87171',
          purple: '#a78bfa',
        },
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
