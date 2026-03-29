'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton } from './WidgetCard'
import { RefreshCw } from 'lucide-react'

function Ring({ score, max = 100, color, label }: { score: number; max?: number; color: string; label: string }) {
  const r = 18, circ = 2 * Math.PI * r, dash = (Math.min(score / max, 1)) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#2a2a2a" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 24 24)" />
        <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="500" fill={color}>
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-[10px] text-text-tertiary">{label}</span>
    </div>
  )
}

function recoveryColor(score: number) {
  if (score >= 67) return '#4ade80'
  if (score >= 34) return '#fbbf24'
  return '#f87171'
}

async function syncAndLoad() {
  await fetch('/api/health/sync', { method: 'POST' }).catch(() => {})
  const res = await fetch('/api/health').then(r => r.json())
  return res.data
}

export function HealthWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    syncAndLoad().then(setData).finally(() => setLoading(false))
  }, [])

  async function refresh() {
    setRefreshing(true)
    const fresh = await syncAndLoad()
    setData(fresh)
    setRefreshing(false)
  }

  const latest = data?.latest
  const trend = data?.trend_7d

  return (
    <WidgetCard
      label="Health"
      action={
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={refreshing} className="text-text-tertiary hover:text-text-secondary transition-colors">
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <a href="/health" className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors">view all →</a>
        </div>
      }
    >
      {loading && <WidgetSkeleton rows={4} />}

      {!loading && !latest && (
        <div className="flex flex-col gap-1">
          <span className="widget-empty">No health data yet</span>
          <a href="/settings" className="btn-connect w-fit">connect Whoop</a>
        </div>
      )}

      {!loading && latest && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-around pt-1">
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

          <div className="flex flex-col divide-y divide-border">
            {[
              { label: 'HRV', val: latest.hrv ? Math.round(latest.hrv) : null, unit: 'ms', sub: trend?.avg_hrv ? `avg ${trend.avg_hrv}` : null },
              { label: 'Sleep', val: latest.sleep_hours ? latest.sleep_hours.toFixed(1) : null, unit: 'hrs', sub: trend?.avg_sleep ? `avg ${trend.avg_sleep}` : null },
              { label: 'Resting HR', val: latest.resting_hr, unit: 'bpm', sub: null },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-text-tertiary">{s.label}</span>
                <div className="flex items-baseline gap-1">
                  {s.val != null
                    ? <><span className="text-sm font-mono text-text-primary">{s.val}</span><span className="text-[10px] text-text-tertiary">{s.unit}</span></>
                    : <span className="text-xs text-text-tertiary font-mono">—</span>
                  }
                  {s.sub && <span className="text-[10px] text-text-dim font-mono ml-1">{s.sub}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-text-dim font-mono border-t border-border pt-2">
            {latest.source} · {latest.metric_date}
          </div>
        </div>
      )}
    </WidgetCard>
  )
}