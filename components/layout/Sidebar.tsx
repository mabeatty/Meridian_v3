'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, CheckSquare, TrendingUp, Heart, BookOpen, BarChart2, Target, Apple, Pill, Settings, PiggyBank } from 'lucide-react'
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
    <aside className="w-[200px] min-w-[200px] h-screen flex flex-col bg-surface border-r border-border">
      <div className="px-4 py-5 border-b border-border">
        <h1 className="text-text-primary font-semibold tracking-tight">Meridian</h1>
        <p className="text-text-tertiary text-xs mt-0.5 font-mono">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
      </div>
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href}
            className={clsx('nav-item', (pathname === href || pathname.startsWith(href + '/')) && 'active')}>
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