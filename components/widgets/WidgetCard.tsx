'use client'
import clsx from 'clsx'

interface WidgetCardProps {
  label: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  accent?: string
  hero?: boolean
}

export function WidgetCard({ label, children, className, action }: WidgetCardProps) {
  return (
    <div className={clsx('widget-card', className)}>
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
        <div key={i} className="skeleton h-4 rounded" style={{ width: `${65 + (i * 9) % 30}%` }} />
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
