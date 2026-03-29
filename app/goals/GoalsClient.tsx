'use client'

import { useState } from 'react'

interface Goal {
  id: string
  title: string
  description: string | null
  category: 'health' | 'finance' | 'productivity' | 'personal'
  target_value: number | null
  current_value: number
  unit: string | null
  due_date: string | null
  status: 'active' | 'completed' | 'paused'
  created_at: string
}

const CAT = {
  health:       { color: 'bg-accent',        text: 'text-accent',        label: 'Health' },
  finance:      { color: 'bg-accent-purple',  text: 'text-accent-purple', label: 'Finance' },
  productivity: { color: 'bg-accent-amber',   text: 'text-accent-amber',  label: 'Work' },
  personal:     { color: 'bg-accent-blue',    text: 'text-accent-blue',   label: 'Personal' },
}

function ProgressBar({ current, target, category }: { current: number; target: number; category: string }) {
  const pct = Math.min(Math.round((current / target) * 100), 100)
  const cat = CAT[category as keyof typeof CAT] ?? CAT.personal
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={`h-full ${cat.color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-text-tertiary w-8 text-right">{pct}%</span>
    </div>
  )
}

function GoalCard({ goal, onUpdate, onComplete, onPause, onDelete }: {
  goal: Goal
  onUpdate: (id: string, value: number) => void
  onComplete: (id: string) => void
  onPause: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [newValue, setNewValue] = useState(goal.current_value.toString())
  const cat = CAT[goal.category] ?? CAT.personal

  function handleSave() {
    onUpdate(goal.id, parseFloat(newValue))
    setEditing(false)
  }

  const isOverdue = goal.due_date && new Date(goal.due_date) < new Date() && goal.status === 'active'

  return (
    <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary">{goal.title}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded bg-surface-3 ${cat.text}`}>
              {cat.label}
            </span>
            {goal.status === 'paused' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-text-tertiary">Paused</span>
            )}
          </div>
          {goal.description && (
            <p className="text-xs text-text-tertiary mt-0.5">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setEditing(!editing)}
            className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            update
          </button>
          <button
            onClick={() => onComplete(goal.id)}
            className="text-[10px] text-text-tertiary hover:text-accent transition-colors"
          >
            ✓ done
          </button>
          <button
            onClick={() => goal.status === 'paused' ? onUpdate(goal.id, goal.current_value) : onPause(goal.id)}
            className="text-[10px] text-text-tertiary hover:text-accent-amber transition-colors"
          >
            {goal.status === 'paused' ? 'resume' : 'pause'}
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="text-[10px] text-text-tertiary hover:text-accent-red transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {goal.target_value !== null && (
        <>
          <ProgressBar current={goal.current_value} target={goal.target_value} category={goal.category} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary font-mono">
              {goal.current_value}{goal.unit ? ` ${goal.unit}` : ''} of {goal.target_value}{goal.unit ? ` ${goal.unit}` : ''}
            </span>
            {goal.due_date && (
              <span className={`text-[10px] font-mono ${isOverdue ? 'text-accent-red' : 'text-text-tertiary'}`}>
                {isOverdue ? 'overdue · ' : 'due '}
                {new Date(goal.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </>
      )}

      {editing && (
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <label className="text-xs text-text-tertiary">Current value:</label>
          <input
            type="text"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            className="bg-surface-3 border border-border rounded-md px-2 py-1 text-sm text-text-primary font-mono w-24
                       focus:outline-none focus:border-border-strong"
          />
          {goal.unit && <span className="text-xs text-text-tertiary">{goal.unit}</span>}
          <button onClick={handleSave} className="btn-primary py-1 px-3 text-xs">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-text-tertiary hover:text-text-secondary">cancel</button>
        </div>
      )}
    </div>
  )
}

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'personal' as const,
  target_value: '',
  current_value: '0',
  unit: '',
  due_date: '',
}

export function GoalsClient({ initialGoals }: { initialGoals: Goal[] }) {
  const [goals, setGoals] = useState(initialGoals)
  const [completed, setCompleted] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const active = goals.filter(g => g.status === 'active')
  const paused = goals.filter(g => g.status === 'paused')

  async function handleCreate() {
    if (!form.title) return
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category,
      target_value: form.target_value ? parseFloat(form.target_value) : null,
      current_value: parseFloat(form.current_value) || 0,
      unit: form.unit || null,
      due_date: form.due_date || null,
      status: 'active',
    }
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(r => r.json())

    if (res.data) {
      setGoals(prev => [res.data, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
    }
    setSaving(false)
  }

  async function handleUpdate(id: string, current_value: number) {
    await fetch('/api/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, current_value }),
    })
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current_value } : g))
  }

  async function handleComplete(id: string) {
    await fetch('/api/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'completed' }),
    })
    const goal = goals.find(g => g.id === id)
    if (goal) setCompleted(prev => [{ ...goal, status: 'completed' }, ...prev])
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  async function handlePause(id: string) {
    await fetch('/api/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'paused' }),
    })
    setGoals(prev => prev.map(g => g.id === id ? { ...g, status: 'paused' } : g))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return
    await fetch(`/api/goals?id=${id}`, { method: 'DELETE' })
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const goalCardProps = (goal: Goal) => ({
    goal,
    onUpdate: handleUpdate,
    onComplete: handleComplete,
    onPause: handlePause,
    onDelete: handleDelete,
  })

  return (
    <div className="max-w-3xl flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-primary font-medium">Goals</h2>
          <p className="text-text-tertiary text-xs mt-0.5">
            {active.length} active · {paused.length} paused · {completed.length} completed this session
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          + new goal
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          <span className="widget-label">New goal</span>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="widget-label">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Run a marathon"
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary
                           placeholder:text-text-tertiary focus:outline-none focus:border-border-strong"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="widget-label">Description (optional)</label>
              <input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Train for the Chicago Marathon"
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary
                           placeholder:text-text-tertiary focus:outline-none focus:border-border-strong"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))}
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none"
              >
                <option value="health">Health</option>
                <option value="finance">Finance</option>
                <option value="productivity">Work</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Due date (optional)</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Target value (optional)</label>
              <input
                type="text"
                value={form.target_value}
                onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))}
                placeholder="26.2"
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary
                           placeholder:text-text-tertiary focus:outline-none font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Unit (optional)</label>
              <input
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                placeholder="miles, lbs, $, hours..."
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary
                           placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Starting value</label>
              <input
                type="text"
                value={form.current_value}
                onChange={e => setForm(p => ({ ...p, current_value: e.target.value }))}
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none font-mono"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleCreate} disabled={saving || !form.title} className="btn-primary">
              {saving ? 'Saving...' : 'Create goal'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-text-tertiary hover:text-text-secondary">
              cancel
            </button>
          </div>
        </div>
      )}

      {/* Active goals */}
      {active.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <span className="text-text-tertiary text-sm">No active goals</span>
          <button onClick={() => setShowForm(true)} className="btn-connect">+ create your first goal</button>
        </div>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="widget-label">Active ({active.length})</span>
          {active.map(goal => <GoalCard key={goal.id} {...goalCardProps(goal)} />)}
        </div>
      )}

      {/* Paused goals */}
      {paused.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="widget-label">Paused ({paused.length})</span>
          {paused.map(goal => <GoalCard key={goal.id} {...goalCardProps(goal)} />)}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="widget-label hover:text-text-secondary transition-colors text-left"
          >
            Completed this session ({completed.length}) {showCompleted ? '↑' : '↓'}
          </button>
          {showCompleted && completed.map(goal => (
            <div key={goal.id} className="bg-surface-2 border border-border rounded-lg p-4 opacity-50">
              <div className="flex items-center gap-2">
                <span className="text-accent text-sm">✓</span>
                <span className="text-sm text-text-secondary line-through">{goal.title}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}