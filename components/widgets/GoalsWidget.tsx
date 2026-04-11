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
    <WidgetCard label="Goals" accent="purple" action={<a href="/goals" className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors">manage →</a>}>
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
