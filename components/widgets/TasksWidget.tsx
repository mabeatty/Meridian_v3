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
