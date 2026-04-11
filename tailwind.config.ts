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
          accent: '#2a3a2a',
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
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(61, 220, 132, 0.08)',
        'glow-blue': '0 0 20px rgba(77, 159, 255, 0.08)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
export default config
