'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton } from './WidgetCard'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const fmt = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(n)

export function BudgetWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7)
    fetch(`/api/budget/summary?month=${month}`)
      .then(r => r.json())
      .then(res => setData(res))
      .finally(() => setLoading(false))
  }, [])

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <WidgetCard
      label="Budget" accent="amber"
      action={<a href="/budget" className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors">view all →</a>}
    >
      {loading && <WidgetSkeleton rows={4} />}
      {!loading && data && (
        <div className="flex flex-col gap-3">
          {/* Total spend vs budget */}
          <div>
            <div className="flex items-end justify-between mb-1">
              <div>
                <span className="text-xl font-light font-mono text-text-primary">{fmt(data.totalSpent)}</span>
                <span className="text-xs text-text-tertiary ml-1">/ {fmt(data.totalBudget)}</span>
              </div>
              <span className="text-[10px] text-text-tertiary">{month}</span>
            </div>
            <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((data.totalSpent / data.totalBudget) * 100, 100)}%`,
                  backgroundColor: data.totalSpent / data.totalBudget > 1 ? '#f87171'
                    : data.totalSpent / data.totalBudget > 0.85 ? '#fbbf24' : '#4ade80'
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-text-tertiary">
                {fmt(data.totalBudget - data.totalSpent)} remaining
              </span>
              <span className="text-[10px] text-text-tertiary font-mono">
                {Math.round((data.totalSpent / data.totalBudget) * 100)}%
              </span>
            </div>
          </div>

          {/* Spending line chart */}
          {data.chartData?.length > 1 && (
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={data.chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px]">
                        <span className="text-text-tertiary">Day {payload[0]?.payload?.day}: </span>
                        <span className="text-text-primary font-mono">{fmt(payload[0]?.value as number)}</span>
                      </div>
                    )
                  }}
                />
                <Line type="monotone" dataKey="spent" stroke="#60a5fa" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Top overspent categories */}
          {data.summary?.filter((c: any) => c.monthly_budget > 0 && c.pct > 75)
            .sort((a: any, b: any) => b.pct - a.pct)
            .slice(0, 3)
            .map((cat: any) => (
              <div key={cat.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs text-text-secondary flex-1 truncate">{cat.name}</span>
                <span className="text-[10px] font-mono"
                  style={{ color: cat.pct >= 100 ? '#f87171' : cat.pct >= 85 ? '#fbbf24' : '#4ade80' }}>
                  {Math.round(cat.pct)}%
                </span>
              </div>
            ))}
        </div>
      )}
      {!loading && !data?.totalBudget && (
        <div className="flex flex-col gap-2">
          <span className="widget-empty">No budget set up yet</span>
          <a href="/budget" className="btn-connect w-fit">set up budget →</a>
        </div>
      )}
    </WidgetCard>
  )
}