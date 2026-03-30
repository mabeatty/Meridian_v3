'use client'

import { useState } from 'react'
import { format } from 'date-fns'

interface Set {
  set: number
  reps: number
  weight: number
  notes?: string
  completed?: boolean
}

interface Exercise {
  id?: string
  exercise_name: string
  sets: Set[]
  notes?: string | null
}

interface Workout {
  id: string
  name: string
  workout_type: string
  scheduled_date: string
  duration_minutes: number | null
  notes: string | null
  status: string
  workout_exercises: Exercise[]
}

interface Health {
  recovery_score: number | null
  hrv: number | null
  strain: number | null
  sleep_hours: number | null
}

function recoveryColor(score: number) {
  if (score >= 67) return '#4ade80'
  if (score >= 34) return '#fbbf24'
  return '#f87171'
}

function recoveryLabel(score: number) {
  if (score >= 67) return 'Green — Train hard'
  if (score >= 34) return 'Yellow — Moderate intensity'
  return 'Red — Rest or deload'
}

export function LogClient({ workout, displayName, health }: {
  workout: Workout | null
  displayName: string
  health: Health | null
}) {
  const [exercises, setExercises] = useState<Exercise[]>(
    workout?.workout_exercises?.map(ex => ({
      ...ex,
      sets: (ex.sets as Set[]).map(s => ({ ...s, completed: false }))
    })) ?? []
  )
  const [activeExercise, setActiveExercise] = useState(0)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'workout' | 'complete'>('workout')
  const [startTime] = useState(new Date())

  const today = format(new Date(), 'EEEE, MMMM d')
  const totalSets = exercises.reduce((s, ex) => s + ex.sets.length, 0)
  const completedSets = exercises.reduce((s, ex) => s + ex.sets.filter(set => set.completed).length, 0)
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0

  function updateSet(exIdx: number, setIdx: number, field: keyof Set, value: any) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return {
        ...ex,
        sets: ex.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s)
      }
    }))
  }

  function toggleSetComplete(exIdx: number, setIdx: number) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return {
        ...ex,
        sets: ex.sets.map((s, j) => j === setIdx ? { ...s, completed: !s.completed } : s)
      }
    }))
  }

  async function completeWorkout() {
    if (!workout) return
    setSaving(true)
    const duration = Math.round((new Date().getTime() - startTime.getTime()) / 1000 / 60)

    await fetch('/api/health/workouts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: workout.id,
        status: 'completed',
        duration_minutes: duration,
        exercises: exercises.map((ex, i) => ({
          exercise_name: ex.exercise_name,
          order_index: i,
          sets: ex.sets.map(({ completed, ...s }) => s),
          notes: ex.notes ?? null,
          superset_group: null,
        }))
      })
    })

    setSaving(false)
    setView('complete')
  }

  // ─── Rest day view ────────────────────────────────────────
  if (!workout) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-center">
          <h1 className="text-white text-xl font-medium">Rest day</h1>
          <p className="text-[#666] text-sm mt-1">{today}</p>
        </div>

        {health?.recovery_score != null && (
          <div className="w-full max-w-sm bg-[#161616] rounded-2xl p-5 border border-[#222]">
            <div className="flex items-center justify-between">
              <span className="text-[#888] text-sm">Recovery</span>
              <span className="text-2xl font-bold font-mono" style={{ color: recoveryColor(health.recovery_score) }}>
                {health.recovery_score}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: recoveryColor(health.recovery_score) }}>
              {recoveryLabel(health.recovery_score)}
            </p>
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#222]">
              <div className="text-center">
                <div className="text-white text-sm font-mono">{health.hrv ? Math.round(health.hrv) : '—'}</div>
                <div className="text-[#555] text-[10px] mt-0.5">HRV ms</div>
              </div>
              <div className="text-center">
                <div className="text-white text-sm font-mono">{health.sleep_hours ? health.sleep_hours.toFixed(1) : '—'}</div>
                <div className="text-[#555] text-[10px] mt-0.5">Sleep hrs</div>
              </div>
              <div className="text-center">
                <div className="text-white text-sm font-mono">{health.strain ? health.strain.toFixed(1) : '—'}</div>
                <div className="text-[#555] text-[10px] mt-0.5">Strain</div>
              </div>
            </div>
          </div>
        )}

        <a href="/dashboard" className="text-[#666] text-sm underline">Go to dashboard</a>
      </div>
    )
  }

  // ─── Complete view ────────────────────────────────────────
  if (view === 'complete') {
    const duration = Math.round((new Date().getTime() - startTime.getTime()) / 1000 / 60)
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-6xl">💪</div>
        <div className="text-center">
          <h1 className="text-white text-2xl font-bold">Workout complete!</h1>
          <p className="text-[#666] text-sm mt-1">{workout.name}</p>
        </div>
        <div className="w-full max-w-sm bg-[#161616] rounded-2xl p-5 border border-[#222] grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-white text-xl font-mono font-bold">{duration}</div>
            <div className="text-[#555] text-[10px] mt-0.5">minutes</div>
          </div>
          <div className="text-center">
            <div className="text-white text-xl font-mono font-bold">{completedSets}</div>
            <div className="text-[#555] text-[10px] mt-0.5">sets logged</div>
          </div>
          <div className="text-center">
            <div className="text-white text-xl font-mono font-bold">{exercises.length}</div>
            <div className="text-[#555] text-[10px] mt-0.5">exercises</div>
          </div>
        </div>
        <a href="/dashboard"
          className="w-full max-w-sm bg-white text-black text-center py-4 rounded-2xl font-semibold text-sm">
          Back to dashboard
        </a>
      </div>
    )
  }

  // ─── Workout view ─────────────────────────────────────────
  const currentEx = exercises[activeExercise]

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">

      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-lg font-semibold">{workout.name}</h1>
            <p className="text-[#666] text-xs mt-0.5">{today}</p>
          </div>
          {health?.recovery_score != null && (
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold font-mono"
                style={{ color: recoveryColor(health.recovery_score) }}>
                {health.recovery_score}
              </span>
              <span className="text-[10px] text-[#555]">recovery</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#555]">{completedSets} / {totalSets} sets</span>
            <span className="text-[11px] text-[#555]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
            <div className="h-full bg-[#4ade80] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Exercise tabs */}
      <div className="px-5 flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
        {exercises.map((ex, i) => {
          const done = ex.sets.every(s => s.completed)
          return (
            <button key={i} onClick={() => setActiveExercise(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors ${
                activeExercise === i
                  ? 'bg-white text-black font-medium'
                  : done
                  ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30'
                  : 'bg-[#161616] text-[#888] border border-[#222]'
              }`}>
              {done ? '✓ ' : ''}{ex.exercise_name}
            </button>
          )
        })}
      </div>

      {/* Current exercise */}
      {currentEx && (
        <div className="flex-1 px-5 pb-32 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="text-white text-xl font-semibold">{currentEx.exercise_name}</h2>
            {currentEx.notes && (
              <p className="text-[#666] text-xs mt-0.5">{currentEx.notes}</p>
            )}
          </div>

          {currentEx.sets.map((set, setIdx) => (
            <div key={setIdx}
              className={`rounded-2xl p-4 border transition-colors ${
                set.completed
                  ? 'bg-[#4ade80]/10 border-[#4ade80]/30'
                  : 'bg-[#161616] border-[#222]'
              }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#888] text-sm font-medium">Set {set.set}</span>
                {set.completed && <span className="text-[#4ade80] text-xs font-medium">✓ Logged</span>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[#555] text-[10px] uppercase tracking-wider">Reps</span>
                  <div className="flex items-center bg-[#0a0a0a] rounded-xl overflow-hidden">
                    <button onClick={() => updateSet(activeExercise, setIdx, 'reps', Math.max(1, set.reps - 1))}
                      className="px-4 py-3 text-[#888] text-xl active:bg-[#222] transition-colors">−</button>
                    <span className="flex-1 text-center text-white text-xl font-mono font-bold">{set.reps}</span>
                    <button onClick={() => updateSet(activeExercise, setIdx, 'reps', set.reps + 1)}
                      className="px-4 py-3 text-[#888] text-xl active:bg-[#222] transition-colors">+</button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[#555] text-[10px] uppercase tracking-wider">Weight (lbs)</span>
                  <div className="flex items-center bg-[#0a0a0a] rounded-xl overflow-hidden">
                    <button onClick={() => updateSet(activeExercise, setIdx, 'weight', Math.max(0, set.weight - 5))}
                      className="px-4 py-3 text-[#888] text-xl active:bg-[#222] transition-colors">−</button>
                    <span className="flex-1 text-center text-white text-xl font-mono font-bold">{set.weight}</span>
                    <button onClick={() => updateSet(activeExercise, setIdx, 'weight', set.weight + 5)}
                      className="px-4 py-3 text-[#888] text-xl active:bg-[#222] transition-colors">+</button>
                  </div>
                </div>
              </div>

              <button onClick={() => toggleSetComplete(activeExercise, setIdx)}
                className={`w-full mt-3 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
                  set.completed
                    ? 'bg-[#4ade80]/20 text-[#4ade80]'
                    : 'bg-white text-black active:bg-[#e5e5e5]'
                }`}>
                {set.completed ? '✓ Logged' : 'Log set'}
              </button>
            </div>
          ))}

          {activeExercise < exercises.length - 1 && (
            <button onClick={() => setActiveExercise(activeExercise + 1)}
              className="text-[#555] text-sm text-center py-3 active:text-[#888] transition-colors">
              Next: {exercises[activeExercise + 1].exercise_name} →
            </button>
          )}
        </div>
      )}

      {/* Bottom complete button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
        <button onClick={completeWorkout} disabled={saving}
          className={`w-full py-4 rounded-2xl text-sm font-semibold transition-colors ${
            progress === 100
              ? 'bg-[#4ade80] text-black active:bg-[#22c55e]'
              : 'bg-[#161616] text-[#666] border border-[#222]'
          }`}>
          {saving ? 'Saving...' : progress === 100
            ? '🎉 Complete workout'
            : `Complete workout (${Math.round(progress)}% done)`}
        </button>
      </div>
    </div>
  )
}