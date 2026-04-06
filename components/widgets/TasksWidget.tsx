'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton } from './WidgetCard'
import { ExternalLink, AlertCircle, Plus, Check } from 'lucide-react'

const PRI: Record<number, { label: string; color: string }> = {
  1: { label: 'Urgent', color: 'text-accent-red' },
  2: { label: 'High',   color: 'text-accent-amber' },
  3: { label: 'Normal', color: 'text-text-tertiary' },
  4: { label: 'Low',    color: 'text-text-dim' },
}

const SOURCE_BADGE: Record<string, string> = {
  manual:  'bg-accent/10 text-accent',
  clickup: 'bg-accent-blue/10 text-accent-blue',
}

export function TasksWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quickAdd, setQuickAdd] = useState('')
  const [adding, setAdding] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then(res => {
      setData(res.data ?? null)
    }).finally(() => setLoading(false))
  }, [])

  async function addTask() {
    if (!quickAdd.trim()) return
    setAdding(true)
    const res = await fetch('/api/tasks/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: quickAdd.trim() }),
    }).then(r => r.json())

    if (res.data) {
      const newTask = {
        id: `manual_${res.data.id}`,
        raw_id: res.data.id,
        name: res.data.title,
        notes: null,
        status: 'open',
        priority: res.data.priority,
        due_date: null,
        source: 'manual',
        list_name: null,
        url: null,
        tags: [],
      }
      setData((prev: any) => ({ ...prev, tasks: [newTask, ...(prev?.tasks ?? [])] }))
      setQuickAdd('')
    }
    setAdding(false)
  }

  async function completeTask(task: any) {
    if (task.source !== 'manual') return
    setCompleting(task.id)
    await fetch('/api/tasks/manual', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.raw_id, archive: true }),
    })
    setData((prev: any) => ({
      ...prev,
      tasks: prev.tasks.filter((t: any) => t.id !== task.id),
    }))
    setCompleting(null)
  }

  const tasks = data?.tasks ?? []
  const overdue = tasks.filter((t: any) => t.due_date && t.due_date < Date.now())
  const rest = tasks.filter((t: any) => !t.due_date || t.due_date >= Date.now())

  const action = tasks.length > 0
    ? <span className="text-[10px] text-text-tertiary font-mono">{tasks.length} open</span>
    : undefined

  return (
    <WidgetCard label="Tasks" action={action}>
      {loading && <WidgetSkeleton rows={4} />}
      {!loading && (
        <div className="flex flex-col gap-2 h-full">
          {/* Quick add */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <input
              value={quickAdd}
              onChange={e => setQuickAdd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Add a task..."
              className="flex-1 bg-surface-3 border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-strong transition-colors"
            />
            <button
              onClick={addTask}
              disabled={adding || !quickAdd.trim()}
              className="p-1.5 rounded-md bg-surface-3 border border-border text-text-tertiary hover:text-text-primary hover:border-border-strong transition-colors disabled:opacity-40"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-0.5">
            {tasks.length === 0 && (
              <span className="widget-empty mt-2">All clear — no open tasks</span>
            )}
            {overdue.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1">
                <AlertCircle size={10} className="text-accent-red" />
                <span className="text-[10px] text-accent-red font-semibold tracking-wide uppercase">
                  Overdue ({overdue.length})
                </span>
              </div>
            )}
            {[...overdue, ...rest].map((task: any) => {
              const od = task.due_date && task.due_date < Date.now()
              const p = task.priority ? PRI[task.priority] : null
              const isCompleting = completing === task.id
              return (
                <div key={task.id} className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-surface-3 transition-colors group">
                  <button
                    onClick={() => completeTask(task)}
                    disabled={task.source !== 'manual' || isCompleting}
                    className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors
                      ${task.source === 'manual'
                        ? 'border-border-strong hover:border-accent hover:bg-accent/10 cursor-pointer'
                        : 'border-border cursor-default opacity-40'}
                      ${isCompleting ? 'bg-accent/20 border-accent' : ''}`}
                  >
                    {isCompleting && <Check size={9} className="text-accent" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-text-secondary truncate">{task.name}</span>
                      {task.url && (
                        <a href={task.url} target="_blank" rel="noopener noreferrer"
                          className="text-text-tertiary opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SOURCE_BADGE[task.source] ?? 'bg-surface-3 text-text-tertiary'}`}>
                        {task.source}
                      </span>
                      {task.list_name && <span className="text-[10px] text-text-tertiary font-mono">{task.list_name}</span>}
                      {p && <span className={`text-[10px] font-semibold ${p.color}`}>{p.label}</span>}
                      {task.due_date && (
                        <span className={`text-[10px] font-mono ${od ? 'text-accent-red' : 'text-text-tertiary'}`}>
                          {od ? 'overdue' : new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer: connect ClickUp if not connected */}
          {!data?.connectedProviders?.clickup && (
            <div className="flex-shrink-0 pt-1 border-t border-border">
              <a href="/api/auth/clickup" className="btn-connect text-[10px] py-1 w-full text-center block">
                + connect ClickUp
              </a>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  )
}
