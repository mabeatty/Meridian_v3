'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Plus, Check, Trash2, ExternalLink, ChevronDown, Archive } from 'lucide-react'

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

function priColor(p: number | null) {
  return PRI_OPTIONS.find(o => o.value === p)?.color ?? 'text-text-tertiary'
}

function priLabel(p: number | null) {
  return PRI_OPTIONS.find(o => o.value === p)?.label ?? 'Normal'
}

export default function TasksPage() {
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

  const [form, setForm] = useState({
    title: '',
    notes: '',
    priority: 3,
    due_date: '',
  })

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    setLoading(true)
    // Bust cache by calling manual endpoint directly for live data
    const [tasksRes, archivedRes] = await Promise.all([
      fetch('/api/tasks').then(r => r.json()),
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
      due_date: task.due_date
        ? new Date(task.due_date).toISOString().split('T')[0]
        : '',
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
          id: `manual_${res.data.id}`,
          raw_id: res.data.id,
          name: res.data.title,
          notes: res.data.notes,
          status: 'open',
          priority: res.data.priority,
          due_date: res.data.due_date ? new Date(res.data.due_date).getTime() : null,
          source: 'manual',
          list_name: null,
          url: null,
          tags: [],
        }, ...prev])
      }
    }

    setShowAdd(false)
    setEditTask(null)
    setSaving(false)
  }

  async function completeTask(task: any) {
    if (task.source !== 'manual') return
    setCompleting(task.id)
    const res = await fetch('/api/tasks/manual', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.raw_id, archive: true }),
    }).then(r => r.json())
    if (res.data) {
      setTasks(prev => prev.filter(t => t.id !== task.id))
      setArchived(prev => [res.data, ...prev])
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
      body: JSON.stringify({ id: task.id, archive: false, archived_at: null }),
    })
    setArchived(prev => prev.filter(t => t.id !== task.id))
    loadTasks()
  }

  const overdue = tasks.filter(t => t.due_date && t.due_date < Date.now())
  const upcoming = tasks.filter(t => !t.due_date || t.due_date >= Date.now())

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">

          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-text-primary text-lg font-medium">Tasks</h1>
              <p className="text-text-tertiary text-xs mt-0.5">
                {tasks.length} open
                {connectedProviders.clickup && ' · ClickUp connected'}
              </p>
            </div>
            <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
              <Plus size={13} />
              Add task
            </button>
          </div>

          {/* Add / Edit form */}
          {showAdd && (
            <div className="bg-surface-2 border border-border rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-text-primary text-sm font-medium">
                {editTask ? 'Edit task' : 'New task'}
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="widget-label">Title</label>
                  <input
                    autoFocus
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveTask()}
                    placeholder="What needs to be done?"
                    className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="widget-label">Priority</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) }))}
                      className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none"
                    >
                      {PRI_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="widget-label">Due date</label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                      className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="widget-label">Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Any additional context..."
                    rows={2}
                    className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={saveTask} disabled={saving || !form.title.trim()} className="btn-primary">
                  {saving ? 'Saving...' : editTask ? 'Update task' : 'Add task'}
                </button>
                <button onClick={() => { setShowAdd(false); setEditTask(null) }}
                  className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Overdue section */}
          {overdue.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 px-1 mb-1">
                <span className="text-[10px] text-accent-red font-semibold uppercase tracking-wider">
                  Overdue ({overdue.length})
                </span>
              </div>
              {overdue.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                  completing={completing}
                  deleting={deleting}
                  overdue
                />
              ))}
            </div>
          )}

          {/* Open tasks */}
          {loading ? (
            <div className="text-xs text-text-tertiary animate-pulse">Loading tasks...</div>
          ) : upcoming.length === 0 && overdue.length === 0 ? (
            <div className="bg-surface-2 border border-border rounded-xl px-5 py-10 text-center">
              <p className="text-text-secondary text-sm">All clear — no open tasks</p>
              <p className="text-text-tertiary text-xs mt-1">Click "Add task" to get started</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {upcoming.length > 0 && overdue.length > 0 && (
                <div className="px-1 mb-1">
                  <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Upcoming</span>
                </div>
              )}
              {upcoming.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                  completing={completing}
                  deleting={deleting}
                  overdue={false}
                />
              ))}
            </div>
          )}

          {/* Connect ClickUp prompt */}
          {!connectedProviders.clickup && (
            <div className="bg-surface-2 border border-border rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Connect ClickUp</p>
                <p className="text-text-tertiary text-xs mt-0.5">Sync your ClickUp tasks alongside manual ones</p>
              </div>
              <a href="/api/auth/clickup" className="btn-connect">Connect</a>
            </div>
          )}

          {/* Archived tasks */}
          {archived.length > 0 && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setShowArchive(p => !p)}
                className="flex items-center gap-2 px-1 py-1 text-[10px] text-text-tertiary hover:text-text-secondary font-semibold uppercase tracking-wider transition-colors"
              >
                <Archive size={11} />
                Completed ({archived.length})
                <ChevronDown size={11} className={`transition-transform ${showArchive ? 'rotate-180' : ''}`} />
              </button>
              {showArchive && archived.map(task => (
                <div key={task.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md bg-surface-2 border border-border opacity-60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border border-accent bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <Check size={9} className="text-accent" />
                    </div>
                    <span className="text-sm text-text-tertiary line-through">{task.title}</span>
                  </div>
                  <button onClick={() => restoreTask(task)}
                    className="text-[10px] text-text-dim hover:text-text-secondary transition-colors">
                    restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, onComplete, onEdit, onDelete, completing, deleting, overdue }: any) {
  const isCompleting = completing === task.id
  const isDeleting = deleting === task.id
  const p = task.priority ? PRI_OPTIONS.find(o => o.value === task.priority) : null

  return (
    <div className={`flex items-start gap-3 px-3 py-3 rounded-lg border transition-colors group
      ${overdue ? 'bg-accent-red/5 border-accent-red/20' : 'bg-surface-2 border-border hover:border-border-strong'}`}>

      {/* Complete button */}
      <button
        onClick={() => onComplete(task)}
        disabled={task.source !== 'manual' || isCompleting}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
          ${task.source === 'manual'
            ? 'border-border-strong hover:border-accent hover:bg-accent/10 cursor-pointer'
            : 'border-border cursor-default opacity-30'}
          ${isCompleting ? 'border-accent bg-accent/20' : ''}`}
      >
        {isCompleting && <Check size={10} className="text-accent" />}
      </button>

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => task.source === 'manual' && onEdit(task)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary">{task.name}</span>
          {task.url && (
            <a href={task.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-text-tertiary opacity-0 group-hover:opacity-100 flex-shrink-0">
              <ExternalLink size={11} />
            </a>
          )}
        </div>
        {task.notes && (
          <p className="text-xs text-text-tertiary mt-0.5 truncate">{task.notes}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SOURCE_BADGE[task.source] ?? 'bg-surface-3 text-text-tertiary'}`}>
            {task.source}
          </span>
          {task.list_name && (
            <span className="text-[10px] text-text-tertiary font-mono">{task.list_name}</span>
          )}
          {p && (
            <span className={`text-[10px] font-semibold ${p.color}`}>{p.label}</span>
          )}
          {task.due_date && (
            <span className={`text-[10px] font-mono ${overdue ? 'text-accent-red font-semibold' : 'text-text-tertiary'}`}>
              {overdue ? 'overdue · ' : ''}{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Delete (manual only) */}
      {task.source === 'manual' && (
        <button
          onClick={() => onDelete(task)}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-accent-red transition-all flex-shrink-0 mt-0.5"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}
