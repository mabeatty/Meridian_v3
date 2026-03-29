'use client'
import clsx from 'clsx'

export function WidgetCard({ label, children, className, action }: {
  label: string; children: React.ReactNode; className?: string; action?: React.ReactNode
}) {
  return (
    <div className={clsx('widget-card', className)} style={{ height: '420px' }}>
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
