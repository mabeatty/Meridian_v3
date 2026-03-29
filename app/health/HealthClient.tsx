'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'

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

function recoveryColor(score: number) {
  if (score >= 67) return '#4ade80'
  if (score >= 34) return '#fbbf24'
  return '#f87171'
}

function Ring({ score, max = 100, color, label, size = 80 }: {
  score: number; max?: number; color: string; label: string; size?: number
}) {
  const pct = Math.min(score / max, 1)
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const cx = size / 2, cy = size / 2

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a2a" strokeWidth="6" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="16" fontWeight="500" fill={color}>
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-xs text-text-tertiary">{label}</span>
    </div>
  )
}

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

function Chart({ data, dataKey, color, label, unit, domain }: {
  data: any[]; dataKey: string; color: string; label: string; unit: string; domain?: [number, number]
}) {
  const filtered = data.filter(d => d[dataKey] !== null)
  if (filtered.length === 0) return (
    <div className="flex items-center justify-center h-32 text-text-tertiary text-sm">No data</div>
  )

  return (
    <div className="bg-surface-2 border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-[0.1em] uppercase text-text-tertiary">{label}</span>
        <span className="text-xs text-text-tertiary font-mono">{unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#555' }} tickLine={false} axisLine={false} />
          <YAxis domain={domain} tick={{ fontSize: 10, fill: '#555' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
            dot={false} activeDot={{ r: 4, fill: color }} connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function HealthClient({ metrics }: { metrics: Metric[] }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    metric_date: new Date().toISOString().split('T')[0],
    hrv: '', resting_hr: '', sleep_hours: '',
    recovery_score: '', steps: '', weight: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const latest = metrics[0] ?? null

  // Prepare chart data — last 14 days, oldest first
  const chartData = [...metrics]
    .slice(0, 14)
    .reverse()
    .map(m => ({
      date: format(parseISO(m.metric_date), 'M/d'),
      recovery: m.recovery_score,
      hrv: m.hrv ? Math.round(m.hrv) : null,
      sleep: m.sleep_hours ? parseFloat(m.sleep_hours.toFixed(1)) : null,
      strain: m.strain ? parseFloat(m.strain.toFixed(1)) : null,
      resting_hr: m.resting_hr,
    }))

  async function handleSave() {
    setSaving(true)
    const payload: any = { metric_date: formData.metric_date, source: 'manual' }
    if (formData.hrv) payload.hrv = parseFloat(formData.hrv)
    if (formData.resting_hr) payload.resting_hr = parseInt(formData.resting_hr)
    if (formData.sleep_hours) payload.sleep_hours = parseFloat(formData.sleep_hours)
    if (formData.recovery_score) payload.recovery_score = parseInt(formData.recovery_score)
    if (formData.steps) payload.steps = parseInt(formData.steps)
    if (formData.weight) payload.weight = parseFloat(formData.weight)

    await fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaved(true)
    setTimeout(() => { setSaved(false); setShowForm(false) }, 1500)
    setSaving(false)
  }

  return (
    <div className="max-w-4xl flex flex-col gap-6">

      {/* Today's summary */}
      {latest && (
        <div className="bg-surface-2 border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-text-primary font-medium">Today</h2>
              <p className="text-text-tertiary text-xs font-mono mt-0.5">
                {latest.metric_date} · {latest.source}
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-connect"
            >
              + manual entry
            </button>
          </div>

          <div className="flex items-center justify-around py-2">
            {latest.recovery_score !== null && (
              <Ring score={latest.recovery_score} color={recoveryColor(latest.recovery_score)} label="Recovery" size={88} />
            )}
            {latest.sleep_quality !== null && (
              <Ring score={latest.sleep_quality} color="#60a5fa" label="Sleep quality" size={88} />
            )}
            {latest.strain !== null && (
              <Ring score={latest.strain} max={21} color="#a78bfa" label="Strain" size={88} />
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            {[
              { label: 'HRV', value: latest.hrv ? `${Math.round(latest.hrv)} ms` : '—' },
              { label: 'Resting HR', value: latest.resting_hr ? `${latest.resting_hr} bpm` : '—' },
              { label: 'Sleep', value: latest.sleep_hours ? `${latest.sleep_hours.toFixed(1)} hrs` : '—' },
              { label: 'Strain', value: latest.strain ? `${latest.strain.toFixed(1)} / 21` : '—' },
            ].map(s => (
              <div key={s.label} className="bg-surface-3 rounded-md p-3">
                <div className="text-sm font-mono text-text-primary">{s.value}</div>
                <div className="text-[10px] text-text-tertiary mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual entry form */}
      {showForm && (
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          <span className="widget-label">Manual entry</span>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'metric_date', label: 'Date', type: 'date' },
              { key: 'recovery_score', label: 'Recovery (0-100)', type: 'number' },
              { key: 'hrv', label: 'HRV (ms)', type: 'number' },
              { key: 'resting_hr', label: 'Resting HR (bpm)', type: 'number' },
              { key: 'sleep_hours', label: 'Sleep (hrs)', type: 'number' },
              { key: 'steps', label: 'Steps', type: 'number' },
              { key: 'weight', label: 'Weight (lbs)', type: 'number' },
            ].map(f => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="widget-label">{f.label}</label>
                <input
                  type={f.type}
                  value={(formData as any)[f.key]}
                  onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary
                             focus:outline-none focus:border-border-strong transition-colors font-mono"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save entry'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-text-tertiary hover:text-text-secondary">
              cancel
            </button>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Chart data={chartData} dataKey="recovery" color="#4ade80" label="Recovery" unit="score" domain={[0, 100]} />
        <Chart data={chartData} dataKey="hrv" color="#60a5fa" label="HRV" unit="ms" />
        <Chart data={chartData} dataKey="sleep" color="#a78bfa" label="Sleep" unit="hrs" domain={[0, 12]} />
        <Chart data={chartData} dataKey="strain" color="#fbbf24" label="Strain" unit="/ 21" domain={[0, 21]} />
      </div>

      {/* History table */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="widget-label">30-day history</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Date', 'Recovery', 'HRV', 'Sleep', 'Sleep quality', 'Resting HR', 'Strain', 'Source'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(m => (
                <tr key={m.metric_date} className="border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary">{m.metric_date}</td>
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: m.recovery_score ? recoveryColor(m.recovery_score) : '#555' }}>
                    {m.recovery_score ?? '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-text-primary">{m.hrv ? Math.round(m.hrv) : '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-primary">{m.sleep_hours ? m.sleep_hours.toFixed(1) : '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-primary">{m.sleep_quality ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-primary">{m.resting_hr ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-primary">{m.strain ? m.strain.toFixed(1) : '—'}</td>
                  <td className="px-4 py-2 text-[10px] text-text-tertiary">{m.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}