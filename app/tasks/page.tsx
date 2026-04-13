'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Plus, Check, Trash2, ExternalLink, ChevronDown, Archive, Sparkles, RefreshCw, AlertTriangle, Clock, Save } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────
const PRI_OPTIONS = [
  { value: 1, label: 'Urgent', color: 'text-accent-red' },
  { value: 2, label: 'High',   color: 'text-accent-amber' },
  { value: 3, label: 'Normal', color: 'text-text-secondary' },
  { value: 4, label: 'Low',    color: 'text-text-dim' },
]
const SOURCE_BADGE: Record<string, string> = {
  manual:  'bg-accent/10 text-accent',
  clickup: 'bg-accent-blue/10 text-accent-blue',
}
const PLAN_PRI_COLOR: Record<string, string> = {
  urgent: 'text-accent-red',
  high:   'text-accent-amber',
  normal: 'text-text-secondary',
}

// ─── Tasks Tab ────────────────────────────────────────────────
function TasksTab() {
  const [tasks, setTasks] = useState<any[]>([])
  const [archived, setArchived] = useState<any[]>([])
  const [connectedProviders, setConnectedProviders] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [showArchive, setShowArchive] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editTask, setEditTask] = useState<any>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', notes: '', priority: 3, due_date: '' })
  const [filters, setFilters] = useState<{ list: string; priority: string; due: string; assignee: string }>({
    list: '', priority: '', due: '', assignee: ''
  })

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    setLoading(true)
    const [tasksRes, archivedRes] = await Promise.all([
      fetch('/api/tasks?full=true').then(r => r.json()),
      fetch('/api/tasks/manual?archived=true').then(r => r.json()),
    ])
    setTasks(tasksRes.data?.tasks ?? [])
    setConnectedProviders(tasksRes.data?.connectedProviders ?? {})
    setArchived(archivedRes.data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setForm({ title: '', notes: '', priority: 3, due_date: '' })
    setEditTask(null)
    setShowAdd(true)
  }

  function openEdit(task: any) {
    if (task.source !== 'manual') return
    setForm({
      title: task.name,
      notes: task.notes ?? '',
      priority: task.priority ?? 3,
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    })
    setEditTask(task)
    setShowAdd(true)
  }

  async function saveTask() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      notes: form.notes || null,
      priority: form.priority,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    }
    if (editTask) {
      const res = await fetch('/api/tasks/manual', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTask.raw_id, ...payload }),
      }).then(r => r.json())
      if (res.data) {
        setTasks(prev => prev.map(t =>
          t.raw_id === editTask.raw_id
            ? { ...t, name: res.data.title, notes: res.data.notes, priority: res.data.priority, due_date: res.data.due_date ? new Date(res.data.due_date).getTime() : null }
            : t
        ))
      }
    } else {
      const res = await fetch('/api/tasks/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json())
      if (res.data) {
        setTasks(prev => [{
          id: `manual_${res.data.id}`, raw_id: res.data.id, name: res.data.title,
          notes: res.data.notes, status: 'open', priority: res.data.priority,
          due_date: res.data.due_date ? new Date(res.data.due_date).getTime() : null,
          source: 'manual', list_name: null, url: null, tags: [],
        }, ...prev])
      }
    }
    setShowAdd(false)
    setEditTask(null)
    setSaving(false)
  }

  async function completeTask(task: any) {
    setCompleting(task.id)
    if (task.source === 'manual') {
      const res = await fetch('/api/tasks/manual', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.raw_id, archive: true }),
      }).then(r => r.json())
      if (res.data) {
        setTasks(prev => prev.filter(t => t.id !== task.id))
        setArchived(prev => [res.data, ...prev])
      }
    } else if (task.source === 'clickup') {
      await fetch('/api/tasks/clickup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.raw_id }),
      })
      setTasks(prev => prev.filter(t => t.id !== task.id))
    }
    setCompleting(null)
  }

  async function deleteTask(task: any) {
    if (task.source !== 'manual') return
    setDeleting(task.id)
    await fetch(`/api/tasks/manual?id=${task.raw_id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== task.id))
    setDeleting(null)
  }

  async function restoreTask(task: any) {
    await fetch('/api/tasks/manual', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, archive: false }),
    })
    setArchived(prev => prev.filter(t => t.id !== task.id))
    loadTasks()
  }

  const now = Date.now()
  const weekEnd = now + 7 * 24 * 60 * 60 * 1000
  const monthEnd = now + 30 * 24 * 60 * 60 * 1000

  const filteredTasks = tasks.filter(t => {
    if (filters.list && t.list_name !== filters.list) return false
    if (filters.priority && String(t.priority) !== filters.priority) return false
    if (filters.due) {
      if (filters.due === 'overdue' && !(t.due_date && t.due_date < now)) return false
      if (filters.due === 'week' && !(t.due_date && t.due_date >= now && t.due_date <= weekEnd)) return false
      if (filters.due === 'month' && !(t.due_date && t.due_date >= now && t.due_date <= monthEnd)) return false
      if (filters.due === 'none' && t.due_date) return false
    }
    if (filters.assignee && !t.assignees?.some((a: any) => a.name === filters.assignee)) return false
    return true
  })

  const overdue = filteredTasks.filter(t => t.due_date && t.due_date < now)
  const upcoming = filteredTasks.filter(t => !t.due_date || t.due_date >= now)

  const allLists = Array.from(new Set(tasks.map((t: any) => t.list_name).filter(Boolean))) as string[]
  const allAssignees = Array.from(new Set(tasks.flatMap((t: any) => (t.assignees ?? []).map((a: any) => a.name)).filter(Boolean))) as string[]
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-tertiary text-xs mt-0.5">
            {tasks.length} open{connectedProviders.clickup ? ' · ClickUp connected' : ''}
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
          <Plus size={13} /> Add task
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {allLists.length > 0 && (
          <select value={filters.list} onChange={e => setFilters(f => ({ ...f, list: e.target.value }))}
            className={`text-xs px-2.5 py-1.5 rounded-lg border bg-surface-2 transition-colors focus:outline-none cursor-pointer
              ${filters.list ? 'border-accent-blue/40 text-text-primary' : 'border-border text-text-tertiary'}`}>
            <option value="">All lists</option>
            {allLists.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}

        <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
          className={`text-xs px-2.5 py-1.5 rounded-lg border bg-surface-2 transition-colors focus:outline-none cursor-pointer
            ${filters.priority ? 'border-accent-amber/40 text-text-primary' : 'border-border text-text-tertiary'}`}>
          <option value="">All priorities</option>
          <option value="1">Urgent</option>
          <option value="2">High</option>
          <option value="3">Normal</option>
          <option value="4">Low</option>
        </select>

        <select value={filters.due} onChange={e => setFilters(f => ({ ...f, due: e.target.value }))}
          className={`text-xs px-2.5 py-1.5 rounded-lg border bg-surface-2 transition-colors focus:outline-none cursor-pointer
            ${filters.due ? 'border-accent-purple/40 text-text-primary' : 'border-border text-text-tertiary'}`}>
          <option value="">All due dates</option>
          <option value="overdue">Overdue</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="none">No due date</option>
        </select>

        {allAssignees.length > 0 && (
          <select value={filters.assignee} onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))}
            className={`text-xs px-2.5 py-1.5 rounded-lg border bg-surface-2 transition-colors focus:outline-none cursor-pointer
              ${filters.assignee ? 'border-accent/40 text-text-primary' : 'border-border text-text-tertiary'}`}>
            <option value="">All assignees</option>
            {allAssignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {activeFilterCount > 0 && (
          <button onClick={() => setFilters({ list: '', priority: '', due: '', assignee: '' })}
            className="text-xs text-text-dim hover:text-text-secondary transition-colors">
            Clear filters
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-surface-2 border border-border rounded-xl p-5 flex flex-col gap-4">
          <h3 className="text-text-primary text-sm font-medium">{editTask ? 'Edit task' : 'New task'}</h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="widget-label">Title</label>
              <input autoFocus value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveTask()} placeholder="What needs to be done?"
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="widget-label">Priority</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) }))}
                  className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none">
                  {PRI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="widget-label">Due date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Any additional context..." rows={2}
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none resize-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveTask} disabled={saving || !form.title.trim()} className="btn-primary">
              {saving ? 'Saving...' : editTask ? 'Update task' : 'Add task'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditTask(null) }}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="px-1 mb-1">
            <span className="text-[10px] text-accent-red font-semibold uppercase tracking-wider">Overdue ({overdue.length})</span>
          </div>
          {overdue.map(task => (
            <TaskRow key={task.id} task={task} onComplete={completeTask} onEdit={openEdit}
              onDelete={deleteTask} completing={completing} deleting={deleting} overdue />
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-xs text-text-tertiary animate-pulse">Loading tasks...</div>
      ) : upcoming.length === 0 && overdue.length === 0 ? (
        <div className="bg-surface-2 border border-border rounded-xl px-5 py-10 text-center">
          <p className="text-text-secondary text-sm">All clear — no open tasks</p>
          <p className="text-text-tertiary text-xs mt-1">Click Add task to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {upcoming.length > 0 && overdue.length > 0 && (
            <div className="px-1 mb-1">
              <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Upcoming</span>
            </div>
          )}
          {upcoming.map(task => (
            <TaskRow key={task.id} task={task} onComplete={completeTask} onEdit={openEdit}
              onDelete={deleteTask} completing={completing} deleting={deleting} overdue={false} />
          ))}
        </div>
      )}

      {!connectedProviders.clickup && (
        <div className="bg-surface-2 border border-border rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-sm">Connect ClickUp</p>
            <p className="text-text-tertiary text-xs mt-0.5">Sync your ClickUp tasks alongside manual ones</p>
          </div>
          <a href="/api/auth/clickup" className="btn-connect">Connect</a>
        </div>
      )}

      {archived.length > 0 && (
        <div className="flex flex-col gap-1">
          <button onClick={() => setShowArchive(p => !p)}
            className="flex items-center gap-2 px-1 py-1 text-[10px] text-text-tertiary hover:text-text-secondary font-semibold uppercase tracking-wider transition-colors">
            <Archive size={11} />
            Completed ({archived.length})
            <ChevronDown size={11} className={`transition-transform ${showArchive ? 'rotate-180' : ''}`} />
          </button>
          {showArchive && archived.map(task => (
            <div key={task.id} className="flex items-center justify-between px-3 py-2.5 rounded-md bg-surface-2 border border-border opacity-60">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border border-accent bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Check size={9} className="text-accent" />
                </div>
                <span className="text-sm text-text-tertiary line-through">{task.title}</span>
              </div>
              <button onClick={() => restoreTask(task)} className="text-[10px] text-text-dim hover:text-text-secondary transition-colors">restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Task Row Component ───────────────────────────────────────
function TaskRow({ task, onComplete, onEdit, onDelete, completing, deleting, overdue }: any) {
  const isCompleting = completing === task.id
  const isDeleting = deleting === task.id
  const p = PRI_OPTIONS.find(o => o.value === task.priority)

  return (
    <div className={`flex items-start gap-3 px-3 py-3 rounded-lg border transition-colors group
      ${overdue ? 'bg-accent-red/5 border-accent-red/20' : 'bg-surface-2 border-border hover:border-border-strong'}`}>
      <button onClick={() => onComplete(task)} disabled={isCompleting}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer
          border-border-strong hover:border-accent hover:bg-accent/10
          ${isCompleting ? 'border-accent bg-accent/20' : ''}`}>
        {isCompleting && <Check size={10} className="text-accent" />}
      </button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => task.source === 'manual' && onEdit(task)}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary">{task.name}</span>
          {task.url && (
            <a href={task.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="text-text-tertiary opacity-0 group-hover:opacity-100 flex-shrink-0">
              <ExternalLink size={11} />
            </a>
          )}
        </div>
        {task.notes && <p className="text-xs text-text-tertiary mt-0.5 truncate">{task.notes}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SOURCE_BADGE[task.source] ?? 'bg-surface-3 text-text-tertiary'}`}>
            {task.source}
          </span>
          {task.list_name && <span className="text-[10px] text-text-tertiary font-mono">{task.list_name}</span>}
          {p && <span className={`text-[10px] font-semibold ${p.color}`}>{p.label}</span>}
          {task.due_date && (
            <span className={`text-[10px] font-mono ${overdue ? 'text-accent-red font-semibold' : 'text-text-tertiary'}`}>
              {overdue ? 'overdue · ' : ''}{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
      {task.source === 'manual' && (
        <button onClick={() => onDelete(task)} disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-accent-red transition-all flex-shrink-0 mt-0.5">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Planner Tab ──────────────────────────────────────────────
function PlannerTab() {
  const [context, setContext] = useState('')
  const [contextSaved, setContextSaved] = useState(false)
  const [savingContext, setSavingContext] = useState(false)
  const [clickupTasks, setClickupTasks] = useState<any[]>([])
  const [manualTasks, setManualTasks] = useState<any[]>([])
  const [plan, setPlan] = useState<any>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completingTask, setCompletingTask] = useState<string | null>(null)
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function init() {
      const [contextRes, planRes, tasksRes, manualRes] = await Promise.all([
        fetch('/api/tasks/context').then(r => r.json()),
        fetch('/api/tasks/planner').then(r => r.json()),
        fetch('/api/tasks/clickup').then(r => r.json()),
        fetch('/api/tasks/manual').then(r => r.json()),
      ])
      setContext(contextRes.context ?? '')
      setPlan(planRes.plan ?? null)
      setGeneratedAt(planRes.generated_at ?? null)
      setClickupTasks(tasksRes.tasks ?? [])
      setManualTasks(manualRes.data ?? [])
      setLoading(false)
    }
    init()
  }, [])

  async function saveContext() {
    setSavingContext(true)
    await fetch('/api/tasks/context', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    })
    setContextSaved(true)
    setTimeout(() => setContextSaved(false), 2000)
    setSavingContext(false)
  }

  async function generatePlan() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clickup_tasks: clickupTasks,
          manual_tasks: manualTasks.map(t => ({ name: t.title, due_date: t.due_date })),
          context,
        }),
      }).then(r => r.json())
      if (res.error) throw new Error(res.error)
      setPlan(res.plan)
      setGeneratedAt(new Date().toISOString())
    } catch (e: any) {
      setError(e.message)
    }
    setGenerating(false)
  }

  async function completeTask(task: any) {
    const key = task.clickup_id ?? task.title
    setCompletingTask(key)
    if (task.source === 'clickup' && task.clickup_id) {
      await fetch('/api/tasks/clickup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.clickup_id }),
      })
    }
    setCompletedTasks(prev => { const next = new Set(prev); next.add(key); return next })
    setCompletingTask(null)
  }

  if (loading) {
    return <div className="text-xs text-text-tertiary animate-pulse">Loading planner...</div>
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Context brain */}
      <div className="bg-surface-2 border border-border rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-text-primary text-sm font-medium">Work context</h3>
            <p className="text-text-tertiary text-xs mt-0.5">
              Tell the AI how your work operates — project types, typical timelines, how your team works.
              The more context, the better the plan.
            </p>
          </div>
          <button onClick={saveContext} disabled={savingContext}
            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0 ml-4">
            <Save size={12} />
            {contextSaved ? 'Saved ✓' : savingContext ? 'Saving...' : 'Save'}
          </button>
        </div>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder={`Example: I work in commercial real estate development. My typical projects include land acquisitions, entitlements, and ground-up construction. Key workflows: surveys take 4-6 weeks (identify surveyor → proposal → draft → final), entitlement applications require 2-3 weeks of preparation, lender reports need 1 week turnaround. I manage a team of 3 and coordinate with outside counsel, surveyors, and city planning departments regularly...`}
          rows={6}
          className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-strong transition-colors resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-dim">
            {clickupTasks.length} ClickUp tasks loaded · {manualTasks.length} manual tasks
          </span>
          <button onClick={generatePlan} disabled={generating}
            className="btn-primary flex items-center gap-2">
            {generating
              ? <><RefreshCw size={13} className="animate-spin" /> Generating plan...</>
              : <><Sparkles size={13} /> Generate week plan</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-sm text-accent-red">{error}</div>
      )}

      {/* Generated plan */}
      {plan && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-text-primary text-sm font-medium">Weekly plan</h3>
            <div className="flex items-center gap-3">
              {generatedAt && (
                <span className="text-[10px] text-text-dim font-mono">
                  Generated {new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
              <button onClick={generatePlan} disabled={generating}
                className="text-[10px] text-text-tertiary hover:text-text-secondary flex items-center gap-1 transition-colors">
                <RefreshCw size={10} className={generating ? 'animate-spin' : ''} />
                Regenerate
              </button>
            </div>
          </div>

          {/* Week summary */}
          {plan.week_summary && (
            <div className="bg-surface-2 border border-border rounded-xl px-4 py-3">
              <p className="text-sm text-text-secondary leading-relaxed">{plan.week_summary}</p>
            </div>
          )}

          {/* Flagged items */}
          {plan.flagged?.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-accent-amber" />
                <span className="text-[10px] text-accent-amber font-semibold uppercase tracking-wider">Needs attention ({plan.flagged.length})</span>
              </div>
              {plan.flagged.map((item: any, i: number) => (
                <div key={i} className="flex items-start gap-3 px-3 py-3 rounded-lg bg-accent-amber/5 border border-accent-amber/20">
                  <AlertTriangle size={13} className="text-accent-amber flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-primary">{item.title}</span>
                      {item.source && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SOURCE_BADGE[item.source] ?? ''}`}>
                          {item.source}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-tertiary mt-0.5">{item.concern}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Day-by-day plan */}
          {plan.days?.map((day: any, i: number) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{day.date}</span>
                {day.focus && <span className="text-xs text-text-tertiary">— {day.focus}</span>}
              </div>
              {day.tasks?.map((task: any, j: number) => {
                const key = task.clickup_id ?? task.title
                const isDone = completedTasks.has(key)
                const isCompleting = completingTask === key
                return (
                  <div key={j}
                    className={`flex items-start gap-3 px-3 py-3 rounded-lg border transition-all
                      ${isDone ? 'opacity-40 bg-surface-2 border-border' : 'bg-surface-2 border-border hover:border-border-strong'}`}>
                    <button
                      onClick={() => !isDone && completeTask(task)}
                      disabled={isDone || isCompleting}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${isDone ? 'border-accent bg-accent/20 cursor-default' : 'border-border-strong hover:border-accent hover:bg-accent/10 cursor-pointer'}
                        ${isCompleting ? 'border-accent bg-accent/10' : ''}`}>
                      {(isDone || isCompleting) && <Check size={10} className="text-accent" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm ${isDone ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                          {task.title}
                        </span>
                        {task.source && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SOURCE_BADGE[task.source] ?? 'bg-surface-3 text-text-tertiary'}`}>
                            {task.source}
                          </span>
                        )}
                        {task.priority && (
                          <span className={`text-[10px] font-semibold ${PLAN_PRI_COLOR[task.priority] ?? 'text-text-tertiary'}`}>
                            {task.priority}
                          </span>
                        )}
                        {task.estimated_time && (
                          <span className="flex items-center gap-1 text-[10px] text-text-dim font-mono">
                            <Clock size={9} />{task.estimated_time}
                          </span>
                        )}
                      </div>
                      {task.reasoning && (
                        <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{task.reasoning}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {!plan && !generating && (
        <div className="bg-surface-2 border border-border rounded-xl px-5 py-10 text-center">
          <Sparkles size={20} className="text-text-dim mx-auto mb-3" />
          <p className="text-text-secondary text-sm">No plan generated yet</p>
          <p className="text-text-tertiary text-xs mt-1">Add your work context above, then click Generate week plan</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function TasksPage() {
  const [tab, setTab] = useState<'tasks' | 'planner'>('tasks')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">

          {/* Page header + tabs */}
          <div className="flex items-center justify-between">
            <h1 className="text-text-primary text-lg font-medium">Tasks</h1>
            <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1">
              <button
                onClick={() => setTab('tasks')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${tab === 'tasks' ? 'bg-surface-3 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}>
                Tasks
              </button>
              <button
                onClick={() => setTab('planner')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5
                  ${tab === 'planner' ? 'bg-surface-3 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}>
                <Sparkles size={11} />
                Planner
              </button>
            </div>
          </div>

          {tab === 'tasks' && <TasksTab />}
          {tab === 'planner' && <PlannerTab />}
        </div>
      </div>
    </div>
  )
}
