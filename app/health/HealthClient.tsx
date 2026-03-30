'use client'

import { useState, useEffect, useRef } from 'react'
import { format, parseISO, startOfWeek, addDays } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// ─── Types ───────────────────────────────────────────────────
interface Metric {
  metric_date: string
  recovery_score: number | null
  hrv: number | null
  resting_hr: number | null
  sleep_hours: number | null
  sleep_quality: number | null
  strain: number | null
  source: string
}

interface WorkoutExercise {
  id: string
  exercise_name: string
  order_index: number
  sets: { set: number; reps: number; weight: number; notes?: string }[]
  superset_group: string | null
  notes: string | null
}

interface Workout {
  id: string
  name: string
  scheduled_date: string
  workout_type: string
  status: string
  duration_minutes: number | null
  notes: string | null
  workout_exercises: WorkoutExercise[]
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  workouts?: any[]
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WORKOUT_TYPES = ['strength', 'cardio', 'mobility', 'hiit', 'tennis', 'yoga']
const KEY_LIFTS = ['Squat', 'Bench Press', 'Overhead Press', 'Row', 'Incline Bench', 'Bulgarian Split Squat']
const PANEL_HEIGHT = 500

function getWeekStart(date: Date): string {
  const d = startOfWeek(date, { weekStartsOn: 0 })
  return format(d, 'yyyy-MM-dd')
}

function recoveryColor(score: number) {
  if (score >= 67) return '#4ade80'
  if (score >= 34) return '#fbbf24'
  return '#f87171'
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-2 border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ─── Ring ─────────────────────────────────────────────────────
function Ring({ score, max = 100, color, label, size = 72 }: {
  score: number; max?: number; color: string; label: string; size?: number
}) {
  const pct = Math.min(score / max, 1)
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const cx = size / 2, cy = size / 2
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a2a" strokeWidth="5" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="500" fill={color}>
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-[10px] text-text-tertiary">{label}</span>
    </div>
  )
}

// ─── Chart ────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-2 border border-border rounded-md px-3 py-2 text-xs">
      <div className="text-text-tertiary mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  )
}

function MiniChart({ data, dataKey, color, label, domain }: {
  data: any[]; dataKey: string; color: string; label: string; domain?: [number, number]
}) {
  return (
    <div className="bg-surface-2 border border-border rounded-lg p-3">
      <span className="text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">{label}</span>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} />
          <YAxis domain={domain} tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5}
            dot={false} activeDot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Workout Modal ────────────────────────────────────────────
function WorkoutModal({ workout, onClose, onSave, onDelete }: {
  workout: Partial<Workout> & { scheduled_date: string }
  onClose: () => void
  onSave: (w: any) => void
  onDelete?: (id: string) => void
}) {
  const [form, setForm] = useState({
    name: workout.name ?? '',
    workout_type: workout.workout_type ?? 'strength',
    scheduled_date: workout.scheduled_date,
    duration_minutes: workout.duration_minutes ?? '',
    status: workout.status ?? 'planned',
    notes: workout.notes ?? '',
  })
  const [exercises, setExercises] = useState<WorkoutExercise[]>(workout.workout_exercises ?? [])
  const [saving, setSaving] = useState(false)

  function addExercise() {
    setExercises(prev => [...prev, {
      id: Math.random().toString(),
      exercise_name: '',
      order_index: prev.length,
      sets: [{ set: 1, reps: 10, weight: 0 }],
      superset_group: null,
      notes: null,
    }])
  }

  function updateExercise(idx: number, field: string, value: any) {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  function addSet(exIdx: number) {
    setExercises(prev => prev.map((e, i) => {
      if (i !== exIdx) return e
      const lastSet = e.sets[e.sets.length - 1]
      return { ...e, sets: [...e.sets, { set: e.sets.length + 1, reps: lastSet?.reps ?? 10, weight: lastSet?.weight ?? 0 }] }
    }))
  }

  function updateSet(exIdx: number, setIdx: number, field: string, value: any) {
    setExercises(prev => prev.map((e, i) => {
      if (i !== exIdx) return e
      return { ...e, sets: e.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s) }
    }))
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises(prev => prev.map((e, i) => {
      if (i !== exIdx) return e
      return { ...e, sets: e.sets.filter((_, j) => j !== setIdx) }
    }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave({
      ...form,
      id: workout.id,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes as string) : null,
      exercises: exercises.map((e, i) => ({
        exercise_name: e.exercise_name,
        order_index: i,
        sets: e.sets,
        superset_group: e.superset_group,
        notes: e.notes,
      })),
    })
    setSaving(false)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-medium">
            {workout.id ? 'Edit workout' : 'New workout'}
          </h3>
          <div className="flex items-center gap-2">
            {workout.id && onDelete && (
              <button onClick={() => { onDelete(workout.id!); onClose() }}
                className="text-xs text-accent-red hover:text-accent-red/80">delete</button>
            )}
            <button onClick={onClose} className="text-text-tertiary text-lg">×</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="widget-label">Name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Upper Body Push"
              className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="widget-label">Date</label>
            <input type="date" value={form.scheduled_date}
              onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))}
              className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none font-mono" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="widget-label">Type</label>
            <select value={form.workout_type} onChange={e => setForm(p => ({ ...p, workout_type: e.target.value }))}
              className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none capitalize">
              {WORKOUT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="widget-label">Duration (min)</label>
            <input type="number" value={form.duration_minutes}
              onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))}
              className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none font-mono" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="widget-label">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none capitalize">
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="widget-label">Notes</label>
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes"
              className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none" />
          </div>
        </div>

        {/* Exercises */}
        {form.workout_type === 'strength' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="widget-label">Exercises</span>
              <button onClick={addExercise} className="btn-connect text-[10px] py-1">+ add exercise</button>
            </div>
            {exercises.map((ex, exIdx) => (
              <div key={ex.id} className="bg-surface-3 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input value={ex.exercise_name}
                    onChange={e => updateExercise(exIdx, 'exercise_name', e.target.value)}
                    placeholder="Exercise name (e.g. Bench Press)"
                    className="flex-1 bg-surface-2 border border-border rounded-md px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none" />
                  <button onClick={() => removeExercise(exIdx)} className="text-accent-red text-xs hover:text-accent-red/80">✕</button>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-text-tertiary px-1">
                    <span>Set</span><span>Reps</span><span>Weight (lbs)</span><span>Notes</span>
                  </div>
                  {ex.sets.map((set, setIdx) => (
                    <div key={setIdx} className="grid grid-cols-4 gap-1 items-center">
                      <span className="text-[11px] text-text-tertiary font-mono px-1">{set.set}</span>
                      <input type="number" value={set.reps}
                        onChange={e => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value))}
                        className="bg-surface-2 border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none font-mono" />
                      <input type="number" value={set.weight}
                        onChange={e => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value))}
                        className="bg-surface-2 border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none font-mono" />
                      <div className="flex items-center gap-1">
                        <input value={set.notes ?? ''}
                          onChange={e => updateSet(exIdx, setIdx, 'notes', e.target.value)}
                          className="flex-1 bg-surface-2 border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none" />
                        <button onClick={() => removeSet(exIdx, setIdx)} className="text-text-dim hover:text-accent-red text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addSet(exIdx)} className="text-[10px] text-text-tertiary hover:text-text-secondary w-fit mt-1">+ add set</button>
                </div>
                <input value={ex.notes ?? ''}
                  onChange={e => updateExercise(exIdx, 'notes', e.target.value)}
                  placeholder="Exercise notes..."
                  className="bg-surface-2 border border-border rounded-md px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none" />
              </div>
            ))}
          </div>
        )}

        <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary">
          {saving ? 'Saving...' : 'Save workout'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Weekly Workout Grid ──────────────────────────────────────
function WorkoutGrid({ weekStart, workouts, onAdd, onEdit }: {
  weekStart: string
  workouts: Workout[]
  onAdd: (date: string) => void
  onEdit: (workout: Workout) => void
}) {
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d
  })

  function statusColor(status: string) {
    if (status === 'completed') return 'text-accent'
    if (status === 'skipped') return 'text-accent-red'
    return 'text-text-tertiary'
  }

  function typeColor(type: string) {
    const colors: Record<string, string> = {
      strength: '#a78bfa', cardio: '#60a5fa', mobility: '#4ade80',
      hiit: '#f87171', tennis: '#fbbf24', yoga: '#34d399',
    }
    return colors[type] ?? '#888'
  }

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map((day, i) => (
          <div key={day} className={`px-2 py-2 text-center ${i > 0 ? 'border-l border-border' : ''}`}>
            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{day.slice(0, 3)}</div>
            <div className="text-[10px] text-text-dim font-mono">{format(weekDates[i], 'M/d')}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[120px]">
        {DAYS.map((day, i) => {
          const dateStr = format(weekDates[i], 'yyyy-MM-dd')
          const dayWorkouts = workouts.filter(w => w.scheduled_date === dateStr)
          return (
            <div key={day}
              className={`${i > 0 ? 'border-l border-border' : ''} p-2 flex flex-col gap-1.5 min-h-[120px] cursor-pointer hover:bg-surface-3 transition-colors`}
              onClick={() => onAdd(dateStr)}>
              {dayWorkouts.map(w => (
                <div key={w.id}
                  className="rounded-md px-2 py-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: typeColor(w.workout_type) + '22', borderLeft: `2px solid ${typeColor(w.workout_type)}` }}
                  onClick={e => { e.stopPropagation(); onEdit(w) }}>
                  <div className={`text-[10px] font-medium ${statusColor(w.status)}`}>{w.name}</div>
                  <div className="text-[9px] text-text-tertiary capitalize">{w.workout_type}{w.duration_minutes ? ` · ${w.duration_minutes}m` : ''}</div>
                  {w.status === 'completed' && <div className="text-[9px] text-accent">✓ done</div>}
                </div>
              ))}
              {dayWorkouts.length === 0 && (
                <div className="flex items-center justify-center flex-1 opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-text-dim">+ add</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Fitness Chat ─────────────────────────────────────────────
function FitnessChat({ weekStart, currentWorkouts, onWorkoutAdd }: {
  weekStart: string
  currentWorkouts: Workout[]
  onWorkoutAdd: (workout: any) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/health/chat?week_start=${weekStart}`)
      .then(r => r.json())
      .then(res => {
        const msgs = (res.messages ?? []).filter((m: any) => m.role === 'user' || m.role === 'assistant')
        const parsed = msgs.map((m: any) => {
          if (m.role === 'assistant') {
            const match = m.content.match(/<workouts>([\s\S]*?)<\/workouts>/)
            let workouts = null
            let content = m.content
            if (match) {
              try { workouts = JSON.parse(match[1].trim()) } catch {}
              content = m.content.replace(/<workouts>[\s\S]*?<\/workouts>/, '').trim()
            }
            return { ...m, content, workouts }
          }
          return m
        })
        setMessages(parsed)
      })
      .finally(() => setLoadingHistory(false))
  }, [weekStart])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    const trimmedHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
    const res = await fetch('/api/health/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, week_start: weekStart, history: trimmedHistory, current_workouts: currentWorkouts }),
    }).then(r => r.json())
    setMessages(prev => [...prev, { role: 'assistant', content: res.text ?? '', workouts: res.workouts }])
    setLoading(false)
  }

  return (
    <div className="flex flex-col bg-surface-2 border border-border rounded-lg overflow-hidden" style={{ height: PANEL_HEIGHT }}>
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <span className="widget-label">Fitness Coach</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
        {loadingHistory && <div className="text-xs text-text-tertiary text-center">Loading...</div>}
        {!loadingHistory && messages.length === 0 && (
          <div className="text-xs text-text-tertiary text-center py-4 leading-relaxed">
            Ask me to plan your workouts — "plan my week based on my recovery" or "give me a push day for today"
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] px-3 py-2 rounded-lg text-xs leading-relaxed ${msg.role === 'user' ? 'bg-accent/10 text-text-primary border border-accent/20' : 'bg-surface-3 text-text-primary'}`}>
              {msg.content}
            </div>
            {msg.workouts && msg.workouts.map((workout, j) => (
              <WorkoutChatCard key={j} workout={workout} onAdd={onWorkoutAdd} />
            ))}
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="bg-surface-3 px-3 py-2 rounded-lg text-xs text-text-tertiary animate-pulse">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Plan workouts, ask about recovery, adjust program..."
            className="flex-1 bg-surface-3 border border-border rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong" />
          <button onClick={send} disabled={loading || !input.trim()} className="btn-primary px-3 py-2 text-xs">Send</button>
        </div>
      </div>
    </div>
  )
}

// ─── Workout Chat Card ────────────────────────────────────────
function WorkoutChatCard({ workout, onAdd }: { workout: any; onAdd: (w: any) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [added, setAdded] = useState(false)

  function handleAdd() {
    onAdd(workout)
    setAdded(true)
  }

  return (
    <div className="w-full bg-surface-2 border border-border rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-text-primary">{workout.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-text-tertiary capitalize">{workout.workout_type}</span>
            {workout.duration_minutes && <span className="text-[10px] text-text-tertiary">{workout.duration_minutes} min</span>}
            <span className="text-[10px] text-text-dim font-mono">{workout.scheduled_date}</span>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-text-tertiary hover:text-text-secondary">
          {expanded ? 'less' : 'expand'}
        </button>
      </div>

      {expanded && workout.exercises?.map((ex: any, i: number) => (
        <div key={i} className="bg-surface-3 rounded-md p-2">
          <span className="text-[11px] font-medium text-text-primary">{ex.exercise_name}</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {ex.sets?.map((s: any, j: number) => (
              <span key={j} className="text-[10px] font-mono text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded">
                {s.reps}×{s.weight}lbs
              </span>
            ))}
          </div>
          {ex.notes && <p className="text-[10px] text-text-dim mt-1">{ex.notes}</p>}
        </div>
      ))}

      <button onClick={handleAdd} disabled={added} className="btn-connect text-[10px] py-1 w-fit">
        {added ? '✓ Added to planner' : '+ Add to planner'}
      </button>
    </div>
  )
}

// ─── Progress Panel ───────────────────────────────────────────
function ProgressPanel({ completedWorkouts, metrics, bodyComp, latestAssessment }: {
  completedWorkouts: Workout[]
  metrics: Metric[]
  bodyComp: any[]
  latestAssessment: any
}) {
  const [activeTab, setActiveTab] = useState<'prs' | 'trends' | 'assessment'>('prs')
  const [generatingAssessment, setGeneratingAssessment] = useState(false)
  const [assessment, setAssessment] = useState(latestAssessment)

  // Build PRs
  const prs: Record<string, { weight: number; reps: number; date: string }> = {}
  for (const workout of completedWorkouts) {
    for (const ex of workout.workout_exercises ?? []) {
      const sets = ex.sets as any[]
      if (!sets?.length) continue
      const best = sets.reduce((b: any, s: any) => (s.weight ?? 0) > (b.weight ?? 0) ? s : b, sets[0])
      if (!prs[ex.exercise_name] || best.weight > prs[ex.exercise_name].weight) {
        prs[ex.exercise_name] = { weight: best.weight, reps: best.reps, date: workout.scheduled_date }
      }
    }
  }

  // Chart data
  const chartData = [...metrics].slice(0, 14).reverse().map(m => ({
    date: format(parseISO(m.metric_date), 'M/d'),
    recovery: m.recovery_score,
    hrv: m.hrv ? Math.round(m.hrv) : null,
    strain: m.strain,
  }))

  async function generateAssessment() {
    setGeneratingAssessment(true)
    const res = await fetch('/api/health/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(r => r.json())
    if (res.data) setAssessment(res.data)
    setGeneratingAssessment(false)
  }

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden flex flex-col" style={{ height: PANEL_HEIGHT }}>
      <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center gap-3">
        {(['prs', 'trends', 'assessment'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`text-xs capitalize transition-colors ${activeTab === tab ? 'text-text-primary font-medium' : 'text-text-tertiary hover:text-text-secondary'}`}>
            {tab === 'prs' ? 'PRs & Lifts' : tab === 'trends' ? 'Trends' : 'Assessment'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'prs' && (
          <div className="flex flex-col gap-2">
            {Object.keys(prs).length === 0 && (
              <div className="text-xs text-text-tertiary text-center py-8">
                No strength history yet — log completed workouts to track PRs
              </div>
            )}
            {KEY_LIFTS.filter(lift => prs[lift]).map(lift => (
              <div key={lift} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-xs text-text-primary">{lift}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-accent">{prs[lift].weight} lbs × {prs[lift].reps}</span>
                  <span className="text-[10px] text-text-dim font-mono">{prs[lift].date}</span>
                </div>
              </div>
            ))}
            {Object.entries(prs).filter(([name]) => !KEY_LIFTS.includes(name)).map(([name, pr]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-xs text-text-primary">{name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-accent">{pr.weight} lbs × {pr.reps}</span>
                  <span className="text-[10px] text-text-dim font-mono">{pr.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: 'Workouts (30d)', value: completedWorkouts.length },
                { label: 'Avg Recovery', value: Math.round(metrics.reduce((s, m) => s + (m.recovery_score ?? 0), 0) / (metrics.length || 1)) },
                { label: 'Avg HRV', value: Math.round(metrics.reduce((s, m) => s + (m.hrv ?? 0), 0) / (metrics.length || 1)) + 'ms' },
              ].map(s => (
                <div key={s.label} className="bg-surface-3 rounded-md p-2 text-center">
                  <div className="text-sm font-mono text-text-primary">{s.value}</div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <MiniChart data={chartData} dataKey="recovery" color="#4ade80" label="Recovery" domain={[0, 100]} />
            <MiniChart data={chartData} dataKey="hrv" color="#60a5fa" label="HRV (ms)" />
            <MiniChart data={chartData} dataKey="strain" color="#fbbf24" label="Strain" domain={[0, 21]} />
            {bodyComp.length > 0 && (
              <div className="bg-surface-3 rounded-md p-3 flex flex-col gap-1">
                <span className="widget-label">Body comp (latest)</span>
                <div className="flex items-center gap-4 mt-1">
                  <div>
                    <div className="text-sm font-mono text-text-primary">{bodyComp[0]?.weight_lbs} lbs</div>
                    <div className="text-[10px] text-text-tertiary">Weight</div>
                  </div>
                  <div>
                    <div className="text-sm font-mono text-text-primary">{bodyComp[0]?.body_fat_pct}%</div>
                    <div className="text-[10px] text-text-tertiary">Body fat</div>
                  </div>
                  <div>
                    <div className="text-sm font-mono text-text-primary">{bodyComp[0]?.lean_mass_lbs} lbs</div>
                    <div className="text-[10px] text-text-tertiary">Lean mass</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assessment' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-tertiary">
                {assessment ? `Last generated: ${assessment.assessment_month}` : 'No assessment yet'}
              </span>
              <button onClick={generateAssessment} disabled={generatingAssessment} className="btn-connect text-[10px] py-1">
                {generatingAssessment ? 'Generating...' : assessment ? 'Regenerate' : 'Generate assessment'}
              </button>
            </div>
            {assessment ? (
              <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                {assessment.content}
              </div>
            ) : (
              <div className="text-xs text-text-tertiary text-center py-8">
                Generate your first monthly assessment to see a comprehensive review of your fitness, health, and nutrition.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Whoop Panel (right 1/3) ──────────────────────────────────
function WhoopPanel({ metrics }: { metrics: Metric[] }) {
  const latest = metrics[0] ?? null
  const [refreshing, setRefreshing] = useState(false)

  const chartData = [...metrics].slice(0, 14).reverse().map(m => ({
    date: format(parseISO(m.metric_date), 'M/d'),
    recovery: m.recovery_score,
    hrv: m.hrv ? Math.round(m.hrv) : null,
    sleep: m.sleep_hours ? parseFloat(m.sleep_hours.toFixed(1)) : null,
    strain: m.strain,
  }))

  async function refresh() {
    setRefreshing(true)
    await fetch('/api/health/sync', { method: 'POST' }).catch(() => {})
    window.location.reload()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Today */}
      <div className="bg-surface-2 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="widget-label">Today · {latest?.metric_date ?? '—'}</span>
          <button onClick={refresh} disabled={refreshing}
            className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors">
            {refreshing ? 'syncing...' : 'sync'}
          </button>
        </div>
        {latest ? (
          <>
            <div className="flex items-center justify-around py-2">
              {latest.recovery_score !== null && (
                <Ring score={latest.recovery_score} color={recoveryColor(latest.recovery_score)} label="Recovery" />
              )}
              {latest.sleep_quality !== null && (
                <Ring score={latest.sleep_quality} color="#60a5fa" label="Sleep" />
              )}
              {latest.strain !== null && (
                <Ring score={latest.strain} max={21} color="#a78bfa" label="Strain" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
              {[
                { label: 'HRV', value: latest.hrv ? `${Math.round(latest.hrv)}ms` : '—' },
                { label: 'Resting HR', value: latest.resting_hr ? `${latest.resting_hr}bpm` : '—' },
                { label: 'Sleep', value: latest.sleep_hours ? `${latest.sleep_hours.toFixed(1)}h` : '—' },
                { label: 'Strain', value: latest.strain ? `${latest.strain.toFixed(1)}/21` : '—' },
              ].map(s => (
                <div key={s.label} className="bg-surface-3 rounded-md p-2">
                  <div className="text-xs font-mono text-text-primary">{s.value}</div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-xs text-text-tertiary text-center py-4">No data — connect Whoop in Settings</div>
        )}
      </div>

      {/* 7-day charts */}
      <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
        <span className="widget-label">7-day trends</span>
        <MiniChart data={chartData.slice(-7)} dataKey="recovery" color="#4ade80" label="Recovery" domain={[0, 100]} />
        <MiniChart data={chartData.slice(-7)} dataKey="hrv" color="#60a5fa" label="HRV (ms)" />
        <MiniChart data={chartData.slice(-7)} dataKey="strain" color="#fbbf24" label="Strain" domain={[0, 21]} />
      </div>

      {/* 30-day history */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="widget-label">30-day history</span>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-2">
              <tr className="border-b border-border">
                {['Date', 'Rec', 'HRV', 'Sleep', 'Strain'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(m => (
                <tr key={m.metric_date} className="border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
                  <td className="px-3 py-1.5 font-mono text-text-secondary">{m.metric_date}</td>
                  <td className="px-3 py-1.5 font-mono" style={{ color: m.recovery_score ? recoveryColor(m.recovery_score) : '#555' }}>
                    {m.recovery_score ?? '—'}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-text-primary">{m.hrv ? Math.round(m.hrv) : '—'}</td>
                  <td className="px-3 py-1.5 font-mono text-text-primary">{m.sleep_hours ? m.sleep_hours.toFixed(1) : '—'}</td>
                  <td className="px-3 py-1.5 font-mono text-text-primary">{m.strain ? m.strain.toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export function HealthClient({ metrics, allWorkouts, completedWorkouts, latestAssessment, bodyComp }: {
  metrics: Metric[]
  allWorkouts: Workout[]
  completedWorkouts: Workout[]
  latestAssessment: any
  bodyComp: any[]
}) {
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()))
  const [workouts, setWorkouts] = useState<Workout[]>(allWorkouts)
  const [showWorkoutModal, setShowWorkoutModal] = useState<{ date: string; workout?: Workout } | null>(null)

  const weekWorkouts = workouts.filter(w => {
    const weekEnd = new Date(weekStart + 'T12:00:00')
    weekEnd.setDate(weekEnd.getDate() + 6)
    return w.scheduled_date >= weekStart && w.scheduled_date <= weekEnd.toISOString().split('T')[0]
  })

  async function handleSaveWorkout(data: any) {
    const isEdit = !!data.id
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch('/api/health/workouts', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json())

    if (res.data) {
      if (isEdit) {
        setWorkouts(prev => prev.map(w => w.id === res.data.id ? res.data : w))
      } else {
        setWorkouts(prev => [...prev, res.data])
      }
    }
  }

  async function handleDeleteWorkout(id: string) {
    await fetch(`/api/health/workouts?id=${id}`, { method: 'DELETE' })
    setWorkouts(prev => prev.filter(w => w.id !== id))
  }

  async function handleAddFromChat(workoutData: any) {
    const res = await fetch('/api/health/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workoutData),
    }).then(r => r.json())
    if (res.data) setWorkouts(prev => [...prev, res.data])
  }

  function prevWeek() {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    setWeekStart(getWeekStart(d))
  }

  function nextWeek() {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + 7)
    setWeekStart(getWeekStart(d))
  }

  const weekEnd = new Date(weekStart + 'T12:00:00')
  weekEnd.setDate(weekEnd.getDate() + 6)

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-primary font-medium">Health & Fitness</h2>
          <p className="text-text-tertiary text-xs mt-0.5">
            {format(new Date(weekStart + 'T12:00:00'), 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="btn-connect px-3">←</button>
          <button onClick={() => setWeekStart(getWeekStart(new Date()))} className="btn-connect px-3 text-[10px]">This week</button>
          <button onClick={nextWeek} className="btn-connect px-3">→</button>
        </div>
      </div>

      {/* Main layout — 2/3 + 1/3 */}
      <div className="grid grid-cols-3 gap-4 items-start">

        {/* Left 2/3 — Fitness */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Weekly workout grid */}
          <WorkoutGrid
            weekStart={weekStart}
            workouts={weekWorkouts}
            onAdd={(date) => setShowWorkoutModal({ date })}
            onEdit={(workout) => setShowWorkoutModal({ date: workout.scheduled_date, workout })}
          />

          {/* Chat + Progress */}
          <div className="grid grid-cols-2 gap-4">
            <FitnessChat
              weekStart={weekStart}
              currentWorkouts={weekWorkouts}
              onWorkoutAdd={handleAddFromChat}
            />
            <ProgressPanel
              completedWorkouts={completedWorkouts}
              metrics={metrics}
              bodyComp={bodyComp}
              latestAssessment={latestAssessment}
            />
          </div>
        </div>

        {/* Right 1/3 — Whoop */}
        <div className="col-span-1">
          <WhoopPanel metrics={metrics} />
        </div>
      </div>

      {/* Workout modal */}
      {showWorkoutModal && (
        <WorkoutModal
          workout={showWorkoutModal.workout ?? { scheduled_date: showWorkoutModal.date }}
          onClose={() => setShowWorkoutModal(null)}
          onSave={handleSaveWorkout}
          onDelete={handleDeleteWorkout}
        />
      )}
    </div>
  )
}