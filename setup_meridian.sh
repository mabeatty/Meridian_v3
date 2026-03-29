#!/bin/bash
# Meridian — complete file setup script
# Run from ~/Desktop/meridian

set -e
BASE=$(pwd)

echo "🔧 Setting up Meridian..."

# ── Directory structure ──────────────────────────────────────
mkdir -p app/api/auth/google/callback
mkdir -p app/api/auth/clickup/callback
mkdir -p app/api/auth/whoop/callback
mkdir -p app/api/auth/disconnect
mkdir -p app/api/calendar
mkdir -p app/api/tasks
mkdir -p app/api/weather
mkdir -p app/api/news/feeds
mkdir -p app/api/health
mkdir -p app/api/finance
mkdir -p app/api/goals
mkdir -p app/api/profile
mkdir -p app/auth/login
mkdir -p app/auth/callback
mkdir -p app/dashboard
mkdir -p app/settings
mkdir -p app/calendar app/tasks app/finances app/health
mkdir -p app/journal app/insights app/goals app/nutrition app/supplements
mkdir -p components/layout
mkdir -p components/widgets
mkdir -p lib/supabase
mkdir -p types
mkdir -p styles
mkdir -p supabase/migrations

# ── .env.local.example ──────────────────────────────────────
cat > .env.local.example << 'EOF'
# ─── Supabase ───────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ─── Google OAuth (Calendar) ────────────────────────────────
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ─── ClickUp ────────────────────────────────────────────────
CLICKUP_CLIENT_ID=your_clickup_client_id
CLICKUP_CLIENT_SECRET=your_clickup_client_secret

# ─── Weather ────────────────────────────────────────────────
OPENWEATHER_API_KEY=your_openweathermap_api_key

# ─── Plaid ──────────────────────────────────────────────────
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox

# ─── Whoop ──────────────────────────────────────────────────
WHOOP_CLIENT_ID=your_whoop_client_id
WHOOP_CLIENT_SECRET=your_whoop_client_secret

# ─── App ────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

cp .env.local.example .env.local
echo "  ✓ .env.local created — fill in your keys"

# ── middleware.ts ────────────────────────────────────────────
cat > middleware.ts << 'EOF'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  if (!user && !isAuthRoute && !isApiRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
EOF
echo "  ✓ middleware.ts"

# ── tailwind.config.ts ───────────────────────────────────────
cat > tailwind.config.ts << 'EOF'
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
EOF
echo "  ✓ tailwind.config.ts"

# ── styles/globals.css ───────────────────────────────────────
cat > styles/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
html, body { height: 100%; background: #0f0f0f; color: #e8e8e8; }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }

@layer components {
  .widget-card { @apply bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3; }
  .widget-label { @apply text-[10px] font-semibold tracking-[0.12em] uppercase text-text-tertiary; }
  .widget-empty { @apply text-text-tertiary text-sm font-mono; }
  .nav-item { @apply flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-all duration-150 cursor-pointer select-none; }
  .nav-item.active { @apply text-text-primary bg-surface-3; }
  .btn-connect { @apply inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-surface-3 border border-border text-text-secondary hover:border-border-strong hover:text-text-primary transition-all duration-150 cursor-pointer; }
  .btn-primary { @apply inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-text-primary text-surface font-medium hover:bg-text-secondary transition-all duration-150 cursor-pointer; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #1a1a1a 25%, #222222 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.font-clock { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
EOF
echo "  ✓ styles/globals.css"

# ── types/index.ts ───────────────────────────────────────────
cat > types/index.ts << 'EOF'
export interface Profile {
  id: string
  display_name: string | null
  location_lat: number | null
  location_lng: number | null
  location_name: string | null
  timezone: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  category: 'health' | 'finance' | 'productivity' | 'personal'
  target_value: number | null
  current_value: number
  unit: string | null
  due_date: string | null
  status: 'active' | 'completed' | 'paused'
  created_at: string
  updated_at: string
}

export interface NewsFeed {
  id: string
  user_id: string
  name: string
  url: string
  category: string
  enabled: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
  colorId?: string
  htmlLink?: string
}

export interface Task {
  id: string
  name: string
  status: string
  priority: number | null
  due_date: number | null
  list_name: string
  url: string
  tags: string[]
}

export interface NewsItem {
  id: string
  title: string
  link: string
  source: string
  category: string
  pubDate: string
  summary?: string
}

export interface PlaidAccount {
  id: string
  name: string
  type: string
  subtype: string
  balance: number
  available_balance: number | null
  currency: string
  mask: string
}

export interface HealthMetrics {
  id: string
  user_id: string
  metric_date: string
  source: string
  recovery_score: number | null
  hrv: number | null
  resting_hr: number | null
  sleep_hours: number | null
  sleep_quality: number | null
  strain: number | null
  steps: number | null
  active_calories: number | null
  weight: number | null
  body_fat: number | null
}
EOF
echo "  ✓ types/index.ts"

# ── lib/supabase/client.ts ───────────────────────────────────
cat > lib/supabase/client.ts << 'EOF'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
EOF
echo "  ✓ lib/supabase/client.ts"

# ── lib/supabase/server.ts ───────────────────────────────────
cat > lib/supabase/server.ts << 'EOF'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}

export function createAdminClient() {
  const { createClient: create } = require('@supabase/supabase-js')
  return create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
EOF
echo "  ✓ lib/supabase/server.ts"

# ── app/layout.tsx ───────────────────────────────────────────
cat > app/layout.tsx << 'EOF'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Meridian',
  description: 'Personal life operating system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-surface text-text-primary font-sans">
        {children}
      </body>
    </html>
  )
}
EOF
echo "  ✓ app/layout.tsx"

# ── app/page.tsx ─────────────────────────────────────────────
cat > app/page.tsx << 'EOF'
import { redirect } from 'next/navigation'
export default function Home() { redirect('/dashboard') }
EOF
echo "  ✓ app/page.tsx"

# ── app/auth/layout.tsx ──────────────────────────────────────
cat > app/auth/layout.tsx << 'EOF'
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      {children}
    </div>
  )
}
EOF

# ── app/auth/callback/route.ts ───────────────────────────────
cat > app/auth/callback/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}/dashboard`)
  }
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
EOF

# ── app/auth/login/page.tsx ──────────────────────────────────
cat > app/auth/login/page.tsx << 'EOF'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setMessage({ type: 'error', text: error.message })
      else setMessage({ type: 'success', text: 'Check your email for the login link.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ type: 'error', text: error.message })
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  async function handleSignUp() {
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    if (error) setMessage({ type: 'error', text: error.message })
    else setMessage({ type: 'success', text: 'Account created — check your email.' })
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-medium text-text-primary tracking-tight">Meridian</h1>
        <p className="text-text-tertiary text-sm mt-1">Your personal operating system</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="widget-label">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
            className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors" />
        </div>
        {mode === 'password' && (
          <div className="flex flex-col gap-1.5">
            <label className="widget-label">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors" />
          </div>
        )}
        {message && (
          <div className={`text-xs px-3 py-2 rounded-md ${message.type === 'error' ? 'bg-surface-3 text-accent-red border border-accent-red/20' : 'bg-surface-3 text-accent border border-accent/20'}`}>
            {message.text}
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary justify-center mt-1">
          {loading ? 'Loading...' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
        </button>
        {mode === 'password' && (
          <button type="button" onClick={handleSignUp} disabled={loading}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors text-center">
            No account? Sign up
          </button>
        )}
        <button type="button" onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors text-center">
          {mode === 'password' ? 'Use magic link instead' : 'Use password instead'}
        </button>
      </form>
    </div>
  )
}
EOF
echo "  ✓ auth pages"

# ── Shared app layout ────────────────────────────────────────
cat > app/dashboard/layout.tsx << 'EOF'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar userEmail={user.email} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
EOF

# Copy layout to all sections
for section in calendar tasks finances health journal insights goals nutrition supplements settings; do
  cp app/dashboard/layout.tsx app/$section/layout.tsx
done
echo "  ✓ layouts"

# ── Stub pages ───────────────────────────────────────────────
for section in calendar tasks finances health journal insights goals nutrition supplements; do
cat > app/$section/page.tsx << EOF
import { Header } from '@/components/layout/Header'
export default function Page() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />
      <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm font-mono">
        ${section} — coming soon
      </div>
    </div>
  )
}
EOF
done
echo "  ✓ stub pages"

# ── components/layout/Sidebar.tsx ────────────────────────────
cat > components/layout/Sidebar.tsx << 'EOF'
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, CheckSquare, TrendingUp, Heart, BookOpen, BarChart2, Target, Apple, Pill, Settings } from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { label: 'Dashboard',   href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Calendar',    href: '/calendar',    icon: Calendar },
  { label: 'Tasks',       href: '/tasks',       icon: CheckSquare },
  { label: 'Finances',    href: '/finances',    icon: TrendingUp },
  { label: 'Health',      href: '/health',      icon: Heart },
  { label: 'Journal',     href: '/journal',     icon: BookOpen },
  { label: 'Insights',    href: '/insights',    icon: BarChart2 },
  { label: 'Goals',       href: '/goals',       icon: Target },
  { label: 'Nutrition',   href: '/nutrition',   icon: Apple },
  { label: 'Supplements', href: '/supplements', icon: Pill },
  { label: 'Settings',    href: '/settings',    icon: Settings },
]

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-[200px] min-w-[200px] h-screen flex flex-col bg-surface border-r border-border">
      <div className="px-4 py-5 border-b border-border">
        <h1 className="text-text-primary font-semibold tracking-tight">Meridian</h1>
        <p className="text-text-tertiary text-xs mt-0.5 font-mono">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
      </div>
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className={clsx('nav-item', (pathname === href || pathname.startsWith(href + '/')) && 'active')}>
            <Icon size={15} strokeWidth={1.5} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-border flex items-center justify-between">
        <span className="text-[11px] text-text-tertiary truncate max-w-[130px]">{userEmail}</span>
        <button onClick={signOut} className="text-[11px] text-text-tertiary hover:text-text-primary transition-colors">out</button>
      </div>
    </aside>
  )
}
EOF
echo "  ✓ Sidebar"

# ── components/layout/Header.tsx ─────────────────────────────
cat > components/layout/Header.tsx << 'EOF'
'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface HeaderProps {
  displayName?: string | null
  weather?: { temp: number; condition: string; location: string } | null
}

function getGreeting(h: number) {
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export function Header({ displayName, weather }: HeaderProps) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  return (
    <header className="flex items-start justify-between px-8 py-5 border-b border-border bg-surface">
      <div>
        <h2 className="text-2xl font-medium text-text-primary tracking-tight">
          {getGreeting(time.getHours())}, {displayName || 'Alex'}.
        </h2>
        <p className="text-text-secondary text-sm mt-0.5">{format(time, 'EEEE, MMMM d')}</p>
      </div>
      <div className="flex items-start gap-8">
        <div className="text-right">
          <div className="font-clock text-3xl font-light text-text-primary tabular-nums tracking-tight">
            {format(time, 'h:mm:ss')}{' '}
            <span className="text-lg text-text-secondary">{format(time, 'aa').toUpperCase()}</span>
          </div>
        </div>
        {weather ? (
          <div className="text-right min-w-[80px]">
            <div className="text-2xl font-light text-text-primary">{Math.round(weather.temp)}°F</div>
            <div className="text-xs text-text-secondary mt-0.5">{weather.condition} · {weather.location}</div>
          </div>
        ) : (
          <div className="text-right min-w-[80px]">
            <div className="text-2xl font-light text-text-tertiary">--°F</div>
          </div>
        )}
      </div>
    </header>
  )
}
EOF
echo "  ✓ Header"

# ── components/widgets/WidgetCard.tsx ────────────────────────
cat > components/widgets/WidgetCard.tsx << 'EOF'
'use client'
import clsx from 'clsx'

export function WidgetCard({ label, children, className, action }: {
  label: string; children: React.ReactNode; className?: string; action?: React.ReactNode
}) {
  return (
    <div className={clsx('widget-card', className)}>
      <div className="flex items-center justify-between">
        <span className="widget-label">{label}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-5 rounded" style={{ width: `${70 + (i * 7) % 25}%` }} />
      ))}
    </div>
  )
}

export function ConnectPrompt({ service, href, label }: { service: string; href: string; label?: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="widget-empty">No {label ?? 'data'} —</span>
      <a href={href} className="btn-connect">connect {service}</a>
    </div>
  )
}
EOF
echo "  ✓ WidgetCard"

# ── components/widgets/CalendarWidget.tsx ────────────────────
cat > components/widgets/CalendarWidget.tsx << 'EOF'
'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton, ConnectPrompt } from './WidgetCard'
import { format, parseISO } from 'date-fns'
import { ExternalLink } from 'lucide-react'

const COLORS: Record<string, string> = {
  '1':'#7986CB','2':'#33B679','3':'#8E24AA','4':'#E67C73',
  '5':'#F6BF26','6':'#F4511E','7':'#039BE5','11':'#D50000',
}

export function CalendarWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notConnected, setNotConnected] = useState(false)

  useEffect(() => {
    fetch('/api/calendar').then(r => r.json()).then(res => {
      if (res.error === 'not_connected') { setNotConnected(true); return }
      setData(res.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <WidgetCard label="Today's Calendar">
      {loading && <WidgetSkeleton rows={3} />}
      {!loading && notConnected && <ConnectPrompt service="Google Calendar" href="/api/auth/google" label="events" />}
      {!loading && !notConnected && data && (
        <div className="flex flex-col gap-1">
          {data.events.length === 0 && <span className="widget-empty">No events today</span>}
          {data.events.map((ev: any) => (
            <div key={ev.id} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-md hover:bg-surface-3 transition-colors ${new Date(ev.end) < new Date() ? 'opacity-40' : ''}`}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ev.colorId ? COLORS[ev.colorId] : '#60a5fa' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-text-primary truncate">{ev.title}</span>
                  {ev.htmlLink && <a href={ev.htmlLink} target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-text-secondary flex-shrink-0"><ExternalLink size={10} /></a>}
                </div>
                <span className="text-xs text-text-tertiary font-mono">
                  {ev.allDay ? 'All day' : `${format(parseISO(ev.start), 'h:mm a')} – ${format(parseISO(ev.end), 'h:mm a')}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
EOF
echo "  ✓ CalendarWidget"

# ── components/widgets/TasksWidget.tsx ───────────────────────
cat > components/widgets/TasksWidget.tsx << 'EOF'
'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton, ConnectPrompt } from './WidgetCard'
import { ExternalLink, AlertCircle } from 'lucide-react'

const PRI: Record<number, { label: string; color: string }> = {
  1: { label: 'Urgent', color: 'text-accent-red' },
  2: { label: 'High',   color: 'text-accent-amber' },
  3: { label: 'Normal', color: 'text-text-tertiary' },
  4: { label: 'Low',    color: 'text-text-tertiary' },
}

export function TasksWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notConnected, setNotConnected] = useState(false)

  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then(res => {
      if (res.error === 'not_connected') { setNotConnected(true); return }
      setData(res.data)
    }).finally(() => setLoading(false))
  }, [])

  const overdue = data?.tasks.filter((t: any) => t.due_date && t.due_date < Date.now()) ?? []
  const rest = data?.tasks.filter((t: any) => !t.due_date || t.due_date >= Date.now()) ?? []

  return (
    <WidgetCard label="Tasks" action={data?.tasks.length ? <span className="text-[10px] text-text-tertiary font-mono">{data.tasks.length} open</span> : undefined}>
      {loading && <WidgetSkeleton rows={4} />}
      {!loading && notConnected && <ConnectPrompt service="ClickUp" href="/api/auth/clickup" label="tasks" />}
      {!loading && !notConnected && data && (
        <div className="flex flex-col gap-1">
          {data.tasks.length === 0 && <span className="widget-empty">All clear — no tasks due</span>}
          {overdue.length > 0 && (
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle size={11} className="text-accent-red" />
              <span className="text-[10px] text-accent-red font-semibold tracking-wide uppercase">Overdue ({overdue.length})</span>
            </div>
          )}
          {[...overdue, ...rest].map((task: any) => {
            const od = task.due_date && task.due_date < Date.now()
            const p = task.priority ? PRI[task.priority] : null
            return (
              <div key={task.id} className="flex items-start gap-2.5 py-1.5 px-2 rounded-md hover:bg-surface-3 transition-colors group">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 border ${od ? 'border-accent-red bg-accent-red/20' : 'border-border-strong'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-text-secondary truncate">{task.name}</span>
                    {task.url && <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-text-tertiary opacity-0 group-hover:opacity-100 flex-shrink-0"><ExternalLink size={10} /></a>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.list_name && <span className="text-[10px] text-text-tertiary font-mono">{task.list_name}</span>}
                    {p && <span className={`text-[10px] font-semibold ${p.color}`}>{p.label}</span>}
                    {task.due_date && <span className={`text-[10px] font-mono ${od ? 'text-accent-red' : 'text-text-tertiary'}`}>{od ? 'overdue' : 'due today'}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
EOF
echo "  ✓ TasksWidget"

# ── components/widgets/NewsWidget.tsx ────────────────────────
cat > components/widgets/NewsWidget.tsx << 'EOF'
'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton } from './WidgetCard'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw } from 'lucide-react'

export function NewsWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const res = await fetch('/api/news').then(r => r.json())
    setData(res.data)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function refresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <WidgetCard label="News" action={<button onClick={refresh} className="text-text-tertiary hover:text-text-secondary transition-colors"><RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /></button>}>
      {loading && <WidgetSkeleton rows={5} />}
      {!loading && data && (
        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
          {data.items.length === 0 && (
            <div className="flex flex-col gap-1">
              <span className="widget-empty">No feeds configured</span>
              <a href="/settings" className="btn-connect w-fit">add feeds in settings</a>
            </div>
          )}
          {data.items.map((item: any) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
              className="group flex flex-col gap-0.5 py-1.5 px-2 rounded-md hover:bg-surface-3 transition-colors">
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors leading-snug">{item.title}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-tertiary font-mono">{item.source}</span>
                <span className="text-[10px] text-text-dim">{formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
EOF
echo "  ✓ NewsWidget"

# ── components/widgets/FinanceWidget.tsx ─────────────────────
cat > components/widgets/FinanceWidget.tsx << 'EOF'
'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton, ConnectPrompt } from './WidgetCard'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
const TYPE_LABEL: Record<string, string> = { depository: 'Cash', investment: 'Invest.', credit: 'Credit', loan: 'Loan' }

export function FinanceWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notConnected, setNotConnected] = useState(false)

  useEffect(() => {
    fetch('/api/finance').then(r => r.json()).then(res => {
      if (res.error === 'not_connected') { setNotConnected(true); return }
      setData(res.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <WidgetCard label="Financial Snapshot">
      {loading && <WidgetSkeleton rows={4} />}
      {!loading && notConnected && <ConnectPrompt service="Plaid" href="/settings#plaid" label="accounts" />}
      {!loading && !notConnected && data && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-2xl font-light text-text-primary font-mono tracking-tight">{fmt(data.net_worth)}</div>
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Net worth</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-3 rounded-md p-2"><div className="text-sm font-mono text-text-primary">{fmt(data.total_cash)}</div><div className="text-[10px] text-text-tertiary mt-0.5">Cash</div></div>
            <div className="bg-surface-3 rounded-md p-2"><div className="text-sm font-mono text-text-primary">{fmt(data.total_investments)}</div><div className="text-[10px] text-text-tertiary mt-0.5">Invested</div></div>
            <div className="bg-surface-3 rounded-md p-2"><div className="text-sm font-mono text-accent-red">{fmt(data.total_credit_balance)}</div><div className="text-[10px] text-text-tertiary mt-0.5">Credit</div></div>
          </div>
          <div className="flex flex-col gap-1 border-t border-border pt-2">
            {data.accounts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-text-tertiary font-mono w-10 flex-shrink-0">{TYPE_LABEL[a.type] ?? a.type}</span>
                  <span className="text-xs text-text-secondary truncate">{a.name}</span>
                  <span className="text-[10px] text-text-dim font-mono">••{a.mask}</span>
                </div>
                <span className={`text-xs font-mono flex-shrink-0 ml-2 ${a.type === 'credit' ? 'text-accent-red' : 'text-text-primary'}`}>{fmt(a.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
EOF
echo "  ✓ FinanceWidget"

# ── components/widgets/HealthWidget.tsx ──────────────────────
cat > components/widgets/HealthWidget.tsx << 'EOF'
'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton } from './WidgetCard'

function Ring({ score }: { score: number }) {
  const color = score >= 67 ? '#4ade80' : score >= 34 ? '#fbbf24' : '#f87171'
  const r = 20, circ = 2 * Math.PI * r, dash = (score / 100) * circ
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#2a2a2a" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="500" fill={color}>{score}</text>
    </svg>
  )
}

export function HealthWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(res => setData(res.data)).finally(() => setLoading(false))
  }, [])

  const latest = data?.latest
  const trend = data?.trend_7d

  return (
    <WidgetCard label="Health" action={<a href="/health" className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors">view all →</a>}>
      {loading && <WidgetSkeleton rows={4} />}
      {!loading && !latest && (
        <div className="flex flex-col gap-1">
          <span className="widget-empty">No health data yet</span>
          <a href="/health" className="btn-connect w-fit">add entry or connect Whoop</a>
        </div>
      )}
      {!loading && latest && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            {latest.recovery_score !== null && (
              <div className="flex flex-col items-center gap-1">
                <Ring score={latest.recovery_score} />
                <span className="text-[10px] text-text-tertiary">Recovery</span>
              </div>
            )}
            <div className="flex-1 flex flex-col divide-y divide-border">
              {[
                { label: 'HRV', val: latest.hrv ? Math.round(latest.hrv) : null, unit: 'ms', sub: trend?.avg_hrv },
                { label: 'Sleep', val: latest.sleep_hours?.toFixed(1), unit: 'hrs', sub: trend?.avg_sleep },
                { label: 'Resting HR', val: latest.resting_hr, unit: 'bpm', sub: null },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-1">
                  <span className="text-xs text-text-tertiary">{s.label}</span>
                  <div className="flex items-baseline gap-1">
                    {s.val != null ? <><span className="text-sm font-mono text-text-primary">{s.val}</span><span className="text-[10px] text-text-tertiary">{s.unit}</span></> : <span className="text-xs text-text-tertiary font-mono">—</span>}
                    {s.sub && <span className="text-[10px] text-text-dim font-mono ml-1">avg {s.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {latest.steps != null && (
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <span className="text-xs text-text-tertiary">Steps</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((latest.steps / 10000) * 100, 100)}%` }} />
                </div>
                <span className="text-xs font-mono text-text-primary">{latest.steps.toLocaleString()}</span>
              </div>
            </div>
          )}
          <div className="text-[10px] text-text-dim font-mono">{latest.source} · {latest.metric_date}</div>
        </div>
      )}
    </WidgetCard>
  )
}
EOF
echo "  ✓ HealthWidget"

# ── components/widgets/GoalsWidget.tsx ───────────────────────
cat > components/widgets/GoalsWidget.tsx << 'EOF'
'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton } from './WidgetCard'

const CAT: Record<string, { color: string; label: string }> = {
  health:       { color: 'bg-accent',         label: 'Health' },
  finance:      { color: 'bg-accent-purple',   label: 'Finance' },
  productivity: { color: 'bg-accent-amber',    label: 'Work' },
  personal:     { color: 'bg-accent-blue',     label: 'Personal' },
}

export function GoalsWidget() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/goals').then(r => r.json()).then(res => setGoals(res.data ?? [])).finally(() => setLoading(false))
  }, [])

  return (
    <WidgetCard label="Goals" action={<a href="/goals" className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors">manage →</a>}>
      {loading && <WidgetSkeleton rows={3} />}
      {!loading && goals.length === 0 && (
        <div className="flex flex-col gap-1">
          <span className="widget-empty">No goals yet</span>
          <a href="/goals" className="btn-connect w-fit">add goals</a>
        </div>
      )}
      {!loading && goals.length > 0 && (
        <div className="flex flex-col">
          {goals.slice(0, 5).map((g: any) => {
            const pct = g.target_value ? Math.min(Math.round((g.current_value / g.target_value) * 100), 100) : null
            const cat = CAT[g.category] ?? CAT.personal
            return (
              <div key={g.id} className="flex flex-col gap-1.5 py-2 border-b border-border last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-text-primary truncate">{g.title}</span>
                  {pct !== null && <span className="text-xs font-mono text-text-tertiary flex-shrink-0">{pct}%</span>}
                </div>
                {pct !== null && (
                  <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                    <div className={`h-full ${cat.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-text-tertiary">{cat.label}</span>
                  {g.target_value != null && <span className="text-[10px] text-text-dim font-mono">{g.current_value}{g.unit ? ` ${g.unit}` : ''} / {g.target_value}{g.unit ? ` ${g.unit}` : ''}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
EOF
echo "  ✓ GoalsWidget"

# ── app/dashboard/page.tsx ───────────────────────────────────
cat > app/dashboard/page.tsx << 'EOF'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CalendarWidget } from '@/components/widgets/CalendarWidget'
import { TasksWidget } from '@/components/widgets/TasksWidget'
import { NewsWidget } from '@/components/widgets/NewsWidget'
import { FinanceWidget } from '@/components/widgets/FinanceWidget'
import { GoalsWidget } from '@/components/widgets/GoalsWidget'
import { HealthWidget } from '@/components/widgets/HealthWidget'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, weatherRes] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user!.id).single(),
    supabase.from('widget_cache').select('data').eq('user_id', user!.id).eq('widget_key', 'weather').single(),
  ])

  const weather = weatherRes.data?.data as any ?? null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        displayName={profileRes.data?.display_name}
        weather={weather ? { temp: weather.temp, condition: weather.condition, location: weather.location } : null}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <CalendarWidget />
          <TasksWidget />
          <NewsWidget />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FinanceWidget />
          <GoalsWidget />
          <HealthWidget />
        </div>
      </div>
    </div>
  )
}
EOF
echo "  ✓ dashboard page"

# ── API routes ───────────────────────────────────────────────

cat > app/api/weather/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cached } = await supabase.from('widget_cache').select('data,fetched_at').eq('user_id', user.id).eq('widget_key', 'weather').single()
  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 30) {
    return NextResponse.json({ data: cached.data, cached: true })
  }

  const { data: profile } = await supabase.from('profiles').select('location_lat,location_lng,location_name').eq('id', user.id).single()
  const lat = profile?.location_lat ?? 41.8781
  const lng = profile?.location_lng ?? -87.6298
  const locationName = profile?.location_name ?? 'Chicago'
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Weather API not configured' }, { status: 503 })

  try {
    const [cr, fr] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial&cnt=8`),
    ])
    const [c, f] = await Promise.all([cr.json(), fr.json()])
    const data = {
      temp: c.main.temp, feels_like: c.main.feels_like, condition: c.weather[0].main,
      description: c.weather[0].description, icon: c.weather[0].icon,
      humidity: c.main.humidity, wind_speed: c.wind.speed, location: locationName,
      high: c.main.temp_max, low: c.main.temp_min,
      hourly: f.list.slice(0, 8).map((h: any) => ({ time: new Date(h.dt * 1000).toISOString(), temp: h.main.temp, icon: h.weather[0].icon, condition: h.weather[0].main })),
      fetched_at: new Date().toISOString(),
    }
    await supabase.from('widget_cache').upsert({ user_id: user.id, widget_key: 'weather', data, fetched_at: data.fetched_at }, { onConflict: 'user_id,widget_key' })
    return NextResponse.json({ data, cached: false })
  } catch { return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 }) }
}
EOF

cat > app/api/calendar/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function refreshToken(rt: string) {
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: rt, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, grant_type: 'refresh_token' }) })
    return (await r.json()).access_token ?? null
  } catch { return null }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cached } = await supabase.from('widget_cache').select('data,fetched_at').eq('user_id', user.id).eq('widget_key', 'calendar').single()
  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 15) return NextResponse.json({ data: cached.data, cached: true })

  const { data: tok } = await supabase.from('oauth_tokens').select('access_token,refresh_token,expires_at').eq('user_id', user.id).eq('provider', 'google').single()
  if (!tok) return NextResponse.json({ data: null, error: 'not_connected', cached: false })

  let at = tok.access_token
  if (tok.expires_at && new Date(tok.expires_at) < new Date() && tok.refresh_token) {
    const nt = await refreshToken(tok.refresh_token)
    if (nt) { at = nt; await supabase.from('oauth_tokens').update({ access_token: nt, expires_at: new Date(Date.now() + 3600000).toISOString() }).eq('user_id', user.id).eq('provider', 'google') }
  }

  try {
    const now = new Date()
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${new URLSearchParams({ timeMin: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(), timeMax: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '20' })}`, { headers: { Authorization: `Bearer ${at}` } })
    const g = await r.json()
    if (g.error) throw new Error(g.error.message)
    const events = (g.items ?? []).map((e: any) => ({ id: e.id, title: e.summary ?? '(No title)', start: e.start.dateTime ?? e.start.date, end: e.end.dateTime ?? e.end.date, allDay: !e.start.dateTime, location: e.location ?? null, colorId: e.colorId ?? null, htmlLink: e.htmlLink ?? null }))
    const data = { events, fetched_at: new Date().toISOString() }
    await supabase.from('widget_cache').upsert({ user_id: user.id, widget_key: 'calendar', data, fetched_at: data.fetched_at }, { onConflict: 'user_id,widget_key' })
    return NextResponse.json({ data, cached: false })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
EOF

cat > app/api/tasks/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cached } = await supabase.from('widget_cache').select('data,fetched_at').eq('user_id', user.id).eq('widget_key', 'tasks').single()
  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 10) return NextResponse.json({ data: cached.data, cached: true })

  const { data: tok } = await supabase.from('oauth_tokens').select('access_token').eq('user_id', user.id).eq('provider', 'clickup').single()
  if (!tok) return NextResponse.json({ data: null, error: 'not_connected', cached: false })

  const h = { Authorization: tok.access_token }
  try {
    const teams = await fetch('https://api.clickup.com/api/v2/team', { headers: h }).then(r => r.json())
    const teamId = teams.teams?.[0]?.id
    if (!teamId) throw new Error('No workspace')
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const td = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/task?${new URLSearchParams({ due_date_lt: todayEnd.getTime().toString(), include_closed: 'false', subtasks: 'true', page: '0' })}`, { headers: h }).then(r => r.json())
    const tasks = (td.tasks ?? []).slice(0, 20).map((t: any) => ({ id: t.id, name: t.name, status: t.status?.status ?? 'unknown', priority: t.priority?.priority ? parseInt(t.priority.priority) : null, due_date: t.due_date ? parseInt(t.due_date) : null, list_name: t.list?.name ?? '', url: t.url ?? '', tags: (t.tags ?? []).map((tg: any) => tg.name) }))
    const data = { tasks, fetched_at: new Date().toISOString() }
    await supabase.from('widget_cache').upsert({ user_id: user.id, widget_key: 'tasks', data, fetched_at: data.fetched_at }, { onConflict: 'user_id,widget_key' })
    return NextResponse.json({ data, cached: false })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
EOF

cat > app/api/news/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cached } = await supabase.from('widget_cache').select('data,fetched_at').eq('user_id', user.id).eq('widget_key', 'news').single()
  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 60) return NextResponse.json({ data: cached.data, cached: true })

  const { data: feeds } = await supabase.from('news_feeds').select('*').eq('user_id', user.id).eq('enabled', true)
  if (!feeds?.length) return NextResponse.json({ data: { items: [], fetched_at: new Date().toISOString() }, cached: false })

  const results = await Promise.allSettled(feeds.map(async feed => {
    const r = await fetch(feed.url, { headers: { 'User-Agent': 'Meridian/1.0' }, signal: AbortSignal.timeout(5000) })
    return { feed, xml: await r.text() }
  }))

  const items: any[] = []
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const { feed, xml } = r.value
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const item = m[1]
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || item.match(/<guid>(https?:\/\/[^<]+)<\/guid>/)?.[1] || ''
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
      if (!title || !link) continue
      items.push({ id: Buffer.from(link).toString('base64').slice(0, 16), title: title.trim(), link: link.trim(), source: feed.name, category: feed.category, pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString() })
    }
  }

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  const data = { items: items.slice(0, 30), fetched_at: new Date().toISOString() }
  await supabase.from('widget_cache').upsert({ user_id: user.id, widget_key: 'news', data, fetched_at: data.fetched_at }, { onConflict: 'user_id,widget_key' })
  return NextResponse.json({ data, cached: false })
}
EOF

cat > app/api/health/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const d = new Date(); d.setDate(d.getDate() - 7)
  const { data: metrics } = await supabase.from('health_metrics').select('*').eq('user_id', user.id).gte('metric_date', d.toISOString().split('T')[0]).order('metric_date', { ascending: false })
  const avg = (arr: (number | null)[]) => { const v = arr.filter((x): x is number => x !== null); return v.length ? Math.round(v.reduce((a, b) => a + b) / v.length * 10) / 10 : null }
  return NextResponse.json({ data: { latest: metrics?.[0] ?? null, trend_7d: { avg_hrv: avg(metrics?.map(m => m.hrv) ?? []), avg_sleep: avg(metrics?.map(m => m.sleep_hours) ?? []), avg_recovery: avg(metrics?.map(m => m.recovery_score) ?? []), avg_steps: avg(metrics?.map(m => m.steps) ?? []) }, history: metrics ?? [], fetched_at: new Date().toISOString() } })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { metric_date, source = 'manual', ...rest } = await req.json()
  const { data, error } = await supabase.from('health_metrics').upsert({ user_id: user.id, metric_date: metric_date ?? new Date().toISOString().split('T')[0], source, ...rest }, { onConflict: 'user_id,metric_date,source' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
EOF

cat > app/api/finance/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: cached } = await supabase.from('widget_cache').select('data,fetched_at').eq('user_id', user.id).eq('widget_key', 'finance').single()
  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 60) return NextResponse.json({ data: cached.data, cached: true })
  const { data: tok } = await supabase.from('oauth_tokens').select('access_token').eq('user_id', user.id).eq('provider', 'plaid').single()
  if (!tok) return NextResponse.json({ data: null, error: 'not_connected', cached: false })
  try {
    const base = process.env.PLAID_ENV === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com'
    const r = await fetch(`${base}/accounts/balance/get`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.PLAID_CLIENT_ID, secret: process.env.PLAID_SECRET, access_token: tok.access_token }) })
    const pd = await r.json()
    if (pd.error_code) throw new Error(pd.error_message)
    const accounts = (pd.accounts ?? []).map((a: any) => ({ id: a.account_id, name: a.name, type: a.type, subtype: a.subtype, balance: a.balances.current ?? 0, available_balance: a.balances.available ?? null, currency: a.balances.iso_currency_code ?? 'USD', mask: a.mask ?? '****' }))
    const total_cash = accounts.filter((a: any) => a.type === 'depository').reduce((s: number, a: any) => s + a.balance, 0)
    const total_investments = accounts.filter((a: any) => a.type === 'investment').reduce((s: number, a: any) => s + a.balance, 0)
    const total_credit_balance = accounts.filter((a: any) => a.type === 'credit').reduce((s: number, a: any) => s + a.balance, 0)
    const data = { accounts, net_worth: total_cash + total_investments - total_credit_balance, total_cash, total_investments, total_credit_balance, fetched_at: new Date().toISOString() }
    await supabase.from('widget_cache').upsert({ user_id: user.id, widget_key: 'finance', data, fetched_at: data.fetched_at }, { onConflict: 'user_id,widget_key' })
    return NextResponse.json({ data, cached: false })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { public_token } = await req.json()
  const base = process.env.PLAID_ENV === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com'
  const r = await fetch(`${base}/item/public_token/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.PLAID_CLIENT_ID, secret: process.env.PLAID_SECRET, public_token }) })
  const d = await r.json()
  if (!d.access_token) return NextResponse.json({ error: d.error_message }, { status: 500 })
  await supabase.from('oauth_tokens').upsert({ user_id: user.id, provider: 'plaid', access_token: d.access_token, metadata: { item_id: d.item_id }, updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider' })
  return NextResponse.json({ success: true })
}
EOF

cat > app/api/goals/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await supabase.from('goals').insert({ ...body, user_id: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
EOF

cat > app/api/profile/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await supabase.from('profiles').update({ ...body, updated_at: new Date().toISOString() }).eq('id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
EOF

cat > app/api/news/feeds/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await supabase.from('news_feeds').insert({ ...body, user_id: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await req.json()
  const { data, error } = await supabase.from('news_feeds').update(updates).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabase.from('news_feeds').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
EOF

cat > app/api/auth/disconnect/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const provider = new URL(req.url).searchParams.get('provider')
  if (!provider) return NextResponse.json({ error: 'Missing provider' }, { status: 400 })
  await supabase.from('oauth_tokens').delete().eq('user_id', user.id).eq('provider', provider)
  const keyMap: Record<string, string> = { google: 'calendar', clickup: 'tasks', plaid: 'finance', whoop: 'health' }
  if (keyMap[provider]) await supabase.from('widget_cache').delete().eq('user_id', user.id).eq('widget_key', keyMap[provider])
  return NextResponse.json({ success: true })
}
EOF

# OAuth routes
cat > app/api/auth/google/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`, response_type: 'code', scope: 'https://www.googleapis.com/auth/calendar.readonly', access_type: 'offline', prompt: 'consent', state: user.id })
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
EOF

cat > app/api/auth/google/callback/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code'), userId = searchParams.get('state')
  if (!code || !userId) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`)
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`, grant_type: 'authorization_code' }) })
    const t = await r.json()
    if (!t.access_token) throw new Error('No token')
    await createAdminClient().from('oauth_tokens').upsert({ user_id: userId, provider: 'google', access_token: t.access_token, refresh_token: t.refresh_token ?? null, expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null, scope: t.scope ?? null, updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider' })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=google`)
  } catch { return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_token_exchange`) }
}
EOF

cat > app/api/auth/clickup/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const params = new URLSearchParams({ client_id: process.env.CLICKUP_CLIENT_ID!, redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/clickup/callback`, state: user.id })
  return NextResponse.redirect(`https://app.clickup.com/api?${params}`)
}
EOF

cat > app/api/auth/clickup/callback/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code'), userId = searchParams.get('state')
  if (!code || !userId) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=clickup_auth_failed`)
  try {
    const r = await fetch('https://api.clickup.com/api/v2/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.CLICKUP_CLIENT_ID, client_secret: process.env.CLICKUP_CLIENT_SECRET, code }) })
    const t = await r.json()
    if (!t.access_token) throw new Error('No token')
    await createAdminClient().from('oauth_tokens').upsert({ user_id: userId, provider: 'clickup', access_token: t.access_token, refresh_token: null, expires_at: null, updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider' })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=clickup`)
  } catch { return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=clickup_token_exchange`) }
}
EOF

cat > app/api/auth/whoop/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const params = new URLSearchParams({ client_id: process.env.WHOOP_CLIENT_ID!, redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/whoop/callback`, response_type: 'code', scope: 'read:recovery read:sleep read:workout read:profile', state: user.id })
  return NextResponse.redirect(`https://api.prod.whoop.com/oauth/oauth2/auth?${params}`)
}
EOF

cat > app/api/auth/whoop/callback/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code'), userId = searchParams.get('state')
  if (!code || !userId) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=whoop_auth_failed`)
  try {
    const r = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.WHOOP_CLIENT_ID!, client_secret: process.env.WHOOP_CLIENT_SECRET!, redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/whoop/callback`, grant_type: 'authorization_code' }) })
    const t = await r.json()
    if (!t.access_token) throw new Error('No token')
    const supabase = createAdminClient()
    await supabase.from('oauth_tokens').upsert({ user_id: userId, provider: 'whoop', access_token: t.access_token, refresh_token: t.refresh_token ?? null, expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider' })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=whoop`)
  } catch { return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=whoop_token_exchange`) }
}
EOF

echo "  ✓ all API routes"

# ── Settings page ─────────────────────────────────────────────
cat > app/settings/page.tsx << 'EOF'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [profileRes, tokensRes, feedsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('oauth_tokens').select('provider').eq('user_id', user!.id),
    supabase.from('news_feeds').select('*').eq('user_id', user!.id).order('created_at'),
  ])
  const connected = new Set((tokensRes.data ?? []).map((t: any) => t.provider))
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header displayName={profileRes.data?.display_name} />
      <div className="flex-1 overflow-y-auto p-6">
        <SettingsClient profile={profileRes.data} connected={{ google: connected.has('google'), clickup: connected.has('clickup'), plaid: connected.has('plaid'), whoop: connected.has('whoop') }} feeds={feedsRes.data ?? []} />
      </div>
    </div>
  )
}
EOF

cat > app/settings/SettingsClient.tsx << 'EOF'
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Circle, ExternalLink, Plus, Trash2 } from 'lucide-react'

export function SettingsClient({ profile, connected, feeds }: any) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const connectedParam = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [locationName, setLocationName] = useState(profile?.location_name ?? 'Chicago')
  const [locationLat, setLocationLat] = useState(profile?.location_lat?.toString() ?? '41.8781')
  const [locationLng, setLocationLng] = useState(profile?.location_lng?.toString() ?? '-87.6298')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newFeedName, setNewFeedName] = useState('')
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newFeedCat, setNewFeedCat] = useState('general')
  const [localFeeds, setLocalFeeds] = useState(feeds)

  async function saveProfile() {
    setSaving(true)
    await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: displayName, location_name: locationName, location_lat: parseFloat(locationLat), location_lng: parseFloat(locationLng) }) })
    setSaved(true); setTimeout(() => setSaved(false), 2000); setSaving(false)
  }

  async function addFeed() {
    if (!newFeedUrl || !newFeedName) return
    const res = await fetch('/api/news/feeds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newFeedName, url: newFeedUrl, category: newFeedCat }) }).then(r => r.json())
    if (res.data) { setLocalFeeds((p: any) => [...p, res.data]); setNewFeedName(''); setNewFeedUrl('') }
  }

  async function deleteFeed(id: string) {
    await fetch(`/api/news/feeds?id=${id}`, { method: 'DELETE' })
    setLocalFeeds((p: any) => p.filter((f: any) => f.id !== id))
  }

  async function disconnectProvider(provider: string) {
    if (!confirm(`Disconnect ${provider}?`)) return
    await fetch(`/api/auth/disconnect?provider=${provider}`, { method: 'DELETE' })
    router.refresh()
  }

  const IntRow = ({ name, desc, isConnected, href, provider }: any) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {isConnected ? <CheckCircle size={16} className="text-accent flex-shrink-0" /> : <Circle size={16} className="text-text-tertiary flex-shrink-0" />}
        <div><div className="text-sm text-text-primary">{name}</div><div className="text-xs text-text-tertiary mt-0.5">{desc}</div></div>
      </div>
      {isConnected
        ? <button onClick={() => disconnectProvider(provider)} className="text-xs text-text-tertiary hover:text-accent-red transition-colors">disconnect</button>
        : <a href={href} className="btn-connect">connect <ExternalLink size={10} /></a>}
    </div>
  )

  return (
    <div className="max-w-2xl">
      {connectedParam && <div className="mb-4 px-4 py-3 rounded-md bg-surface-2 border border-accent/20 text-sm text-accent">✓ {connectedParam} connected</div>}
      {errorParam && <div className="mb-4 px-4 py-3 rounded-md bg-surface-2 border border-accent-red/20 text-sm text-accent-red">Error: {errorParam.replace(/_/g, ' ')}</div>}

      <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-text-tertiary mb-3">Profile</h2>
      <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {[['Display name', displayName, setDisplayName, 'Alex', false], ['City', locationName, setLocationName, 'Chicago', false], ['Latitude', locationLat, setLocationLat, '41.8781', true], ['Longitude', locationLng, setLocationLng, '-87.6298', true]].map(([label, val, set, ph, mono]: any) => (
            <div key={label} className="flex flex-col gap-1.5">
              <label className="widget-label">{label}</label>
              <input value={val} onChange={(e: any) => set(e.target.value)} placeholder={ph}
                className={`bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors ${mono ? 'font-mono' : ''}`} />
            </div>
          ))}
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary w-fit">
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save profile'}
        </button>
      </div>

      <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-text-tertiary mb-3">Integrations</h2>
      <div className="bg-surface-2 border border-border rounded-lg px-4 mb-2">
        <IntRow name="Google Calendar" desc="Today's events on the dashboard" isConnected={connected.google} href="/api/auth/google" provider="google" />
        <IntRow name="ClickUp" desc="Tasks due today and overdue" isConnected={connected.clickup} href="/api/auth/clickup" provider="clickup" />
        <IntRow name="Plaid" desc="Account balances and net worth" isConnected={connected.plaid} href="/settings#plaid" provider="plaid" />
        <IntRow name="Whoop" desc="Recovery, HRV, sleep and strain" isConnected={connected.whoop} href="/api/auth/whoop" provider="whoop" />
      </div>
      <div className="mb-6 px-4 py-3 rounded-md bg-surface-2 border border-border text-xs text-text-tertiary">
        <strong className="text-text-secondary">Apple Health:</strong> Use the <a href="https://apps.apple.com/app/health-auto-export/id1511373910" target="_blank" className="text-accent-blue hover:underline">Health Auto Export</a> iOS app → webhook to your Supabase URL, or import CSV via the Health page.
      </div>

      <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-text-tertiary mb-3">News Feeds</h2>
      <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
        {localFeeds.map((feed: any) => (
          <div key={feed.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
            <input type="checkbox" checked={feed.enabled} onChange={async (e) => { await fetch('/api/news/feeds', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: feed.id, enabled: e.target.checked }) }); setLocalFeeds((p: any) => p.map((f: any) => f.id === feed.id ? { ...f, enabled: e.target.checked } : f)) }} className="accent-accent" />
            <div className="flex-1 min-w-0"><span className="text-sm text-text-primary">{feed.name}</span><span className="text-xs text-text-tertiary ml-2 font-mono">{feed.url.slice(0, 40)}...</span></div>
            <button onClick={() => deleteFeed(feed.id)} className="text-text-tertiary hover:text-accent-red transition-colors flex-shrink-0"><Trash2 size={13} /></button>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 pt-1">
          <input value={newFeedName} onChange={e => setNewFeedName(e.target.value)} placeholder="Feed name" className="bg-surface-3 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none" />
          <input value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)} placeholder="https://..." className="bg-surface-3 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono" />
          <select value={newFeedCat} onChange={e => setNewFeedCat(e.target.value)} className="bg-surface-3 border border-border rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none">
            {['general','tech','health','finance','news'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={addFeed} disabled={!newFeedName || !newFeedUrl} className="btn-primary px-3"><Plus size={14} /></button>
        </div>
      </div>
    </div>
  )
}
EOF
echo "  ✓ Settings pages"

# ── Supabase migration ────────────────────────────────────────
cat > supabase/migrations/001_initial_schema.sql << 'EOF'
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  location_lat float,
  location_lng float,
  location_name text,
  timezone text default 'America/Chicago',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.oauth_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

create table public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null,
  target_value float,
  current_value float default 0,
  unit text,
  due_date date,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.journal_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  mood int check (mood between 1 and 10),
  energy int check (energy between 1 and 10),
  tags text[] default '{}',
  entry_date date default current_date,
  created_at timestamptz default now()
);

create table public.health_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  metric_date date not null,
  source text not null,
  recovery_score int,
  hrv float,
  resting_hr int,
  sleep_hours float,
  sleep_quality int,
  strain float,
  steps int,
  active_calories int,
  weight float,
  body_fat float,
  raw jsonb default '{}',
  created_at timestamptz default now(),
  unique(user_id, metric_date, source)
);

create table public.financial_snapshots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  snapshot_date date not null,
  accounts jsonb not null default '[]',
  net_worth float,
  total_cash float,
  total_investments float,
  total_credit_balance float,
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);

create table public.news_feeds (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  url text not null,
  category text default 'general',
  enabled boolean default true,
  created_at timestamptz default now(),
  unique(user_id, url)
);

create table public.widget_cache (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  widget_key text not null,
  data jsonb not null default '{}',
  fetched_at timestamptz default now(),
  unique(user_id, widget_key)
);

alter table public.profiles enable row level security;
alter table public.oauth_tokens enable row level security;
alter table public.goals enable row level security;
alter table public.journal_entries enable row level security;
alter table public.health_metrics enable row level security;
alter table public.financial_snapshots enable row level security;
alter table public.news_feeds enable row level security;
alter table public.widget_cache enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id);
create policy "own tokens" on public.oauth_tokens for all using (auth.uid() = user_id);
create policy "own goals" on public.goals for all using (auth.uid() = user_id);
create policy "own journal" on public.journal_entries for all using (auth.uid() = user_id);
create policy "own health" on public.health_metrics for all using (auth.uid() = user_id);
create policy "own snapshots" on public.financial_snapshots for all using (auth.uid() = user_id);
create policy "own feeds" on public.news_feeds for all using (auth.uid() = user_id);
create policy "own cache" on public.widget_cache for all using (auth.uid() = user_id);

create index idx_health_user_date on public.health_metrics(user_id, metric_date desc);
create index idx_journal_user_date on public.journal_entries(user_id, entry_date desc);
create index idx_cache_user_key on public.widget_cache(user_id, widget_key);

create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.news_feeds (user_id, name, url, category) values
    (new.id, 'Hacker News', 'https://hnrss.org/frontpage', 'tech'),
    (new.id, 'The Verge', 'https://www.theverge.com/rss/index.xml', 'tech'),
    (new.id, 'NYT Health', 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', 'health');
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();
EOF
echo "  ✓ Supabase migration"

echo ""
echo "✅ Meridian setup complete!"
echo ""
echo "Next steps:"
echo "  1. Fill in .env.local with your keys"
echo "  2. Run the SQL in supabase/migrations/001_initial_schema.sql"
echo "  3. npm run dev"
