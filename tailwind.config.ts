import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  safelist: [
    'border-l-accent', 'border-l-accent-blue', 'border-l-accent-amber',
    'border-l-accent-purple', 'border-l-accent-red',
    'bg-surface-elevated', 'bg-surface-5', 'border-surface-5',
    'text-accent-blue', 'text-accent-amber', 'text-accent-red', 'text-accent-purple',
    'bg-accent-blue', 'bg-accent-amber', 'bg-accent-red', 'bg-accent-purple',
    'border-accent-blue', 'border-accent-amber', 'border-accent-red',
    'bg-accent/10', 'bg-accent-red/10', 'bg-accent-blue/10', 'bg-accent-amber/10',
    'text-surface-4', 'bg-surface-4', 'bg-surface-1',
    'shadow-card', 'shadow-card-hover', 'shadow-glow-green', 'shadow-glow-blue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#0a0a0a',
          1: '#111111',
          2: '#161616',
          3: '#1e1e1e',
          4: '#262626',
          5: '#2e2e2e',
          elevated: '#1a1a1a',
        },
        border: {
          DEFAULT: '#242424',
          subtle: '#181818',
          strong: '#363636',
        },
        text: {
          primary: '#f0f0f0',
          secondary: '#909090',
          tertiary: '#505050',
          dim: '#303030',
        },
        accent: {
          DEFAULT: '#3ddc84',
          dim: '#1a3d2a',
          blue: '#4d9fff',
          'blue-dim': '#1a2d4d',
          amber: '#f5a623',
          'amber-dim': '#3d2a0a',
          red: '#ff6b6b',
          'red-dim': '#3d1a1a',
          purple: '#9d7cf4',
          'purple-dim': '#2a1a4d',
        },
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(61, 220, 132, 0.08)',
        'glow-blue': '0 0 20px rgba(77, 159, 255, 0.08)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
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
