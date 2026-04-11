'use client'
import clsx from 'clsx'

interface WidgetCardProps {
  label: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  accent?: 'green' | 'blue' | 'amber' | 'purple' | 'red'
  hero?: boolean
}

const ACCENT_STYLES = {
  green:  'border-l-[2px] border-l-accent',
  blue:   'border-l-[2px] border-l-accent-blue',
  amber:  'border-l-[2px] border-l-accent-amber',
  purple: 'border-l-[2px] border-l-accent-purple',
  red:    'border-l-[2px] border-l-accent-red',
}

export function WidgetCard({ label, children, className, action, accent, hero }: WidgetCardProps) {
  return (
    <div className={clsx(
      'flex flex-col gap-3 rounded-xl border border-border',
      hero ? 'bg-surface-elevated p-5' : 'bg-surface-2 p-5',
      accent && ACCENT_STYLES[accent],
      'transition-all duration-200',
      className
    )}
      style={{
        height: '420px',
        boxShadow: hero
          ? '0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)'
          : '0 1px 3px rgba(0,0,0,0.4)',
      }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <span className="widget-label">{label}</span>
        {action}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  )
}

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5 pt-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-4 rounded-md" style={{ width: `${65 + (i * 9) % 30}%` }} />
      ))}
    </div>
  )
}

export function ConnectPrompt({ service, href, label }: { service: string; href: string; label?: string }) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <span className="widget-empty">No {label ?? 'data'} connected</span>
      <a href={href} className="btn-connect w-fit mt-1">Connect {service}</a>
    </div>
  )
}
