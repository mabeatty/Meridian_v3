'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, CheckSquare, TrendingUp,
  Heart, BookOpen, BarChart2, Target, Apple, Pill, Settings, PiggyBank
} from 'lucide-react'
import clsx from 'clsx'

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
    <aside className="w-[196px] min-w-[196px] h-screen flex flex-col bg-surface-1 border-r border-border">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-baseline gap-2">
          <h1 className="text-text-primary font-semibold tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Meridian
          </h1>
          <span className="text-[9px] text-text-tertiary font-mono tracking-widest uppercase">OS</span>
        </div>
        <p className="text-text-tertiary text-[11px] mt-0.5 font-mono">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto flex flex-col gap-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={clsx(
                'nav-item',
                active && 'active'
              )}>
              <Icon size={14} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[13px]">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3.5 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary truncate max-w-[130px] font-mono">{userEmail}</span>
          <button onClick={signOut}
            className="text-[11px] text-text-tertiary hover:text-text-primary transition-colors font-mono">
            sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
