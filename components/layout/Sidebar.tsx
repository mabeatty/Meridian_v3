'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, CheckSquare, TrendingUp,
  Heart, BookOpen, BarChart2, Target, Apple, Pill, Settings, PiggyBank
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard',   href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Calendar',    href: '/calendar',    icon: Calendar },
  { label: 'Tasks',       href: '/tasks',       icon: CheckSquare },
  { label: 'Finances',    href: '/finances',    icon: TrendingUp },
  { label: 'Budget',      href: '/budget',      icon: PiggyBank },
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
    <aside style={{
      width: '196px',
      minWidth: '196px',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#3a3a3a',
      borderRight: '1px solid #525252',
    }}>
      {/* Logo */}
      <div style={{ height: '64px', padding: '0 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #525252', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#f0f0f0',
            letterSpacing: '-0.01em',
            fontFamily: "'DM Sans', sans-serif",
          }}>Meridian</span>
          <span style={{
            fontSize: '9px',
            color: '#c0c0c0',
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>OS</span>
        </div>

      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 10px',
                borderRadius: '8px',
                fontSize: '13px',
                color: active ? '#f0f0f0' : '#c0c0c0',
                background: active ? '#4e4e4e' : 'transparent',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = '#c0c0c0'
                  ;(e.currentTarget as HTMLElement).style.background = '#4a4a4a'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = '#c0c0c0'
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }
              }}
            >
              <Icon size={14} strokeWidth={active ? 2 : 1.5} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #525252', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: '#c0c0c0', fontFamily: "'DM Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
          {userEmail}
        </span>
        <button onClick={signOut} style={{
          fontSize: '11px',
          color: '#c0c0c0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'DM Mono', monospace",
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f0f0f0'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#c0c0c0'}
        >
          sign out
        </button>
      </div>
    </aside>
  )
}
