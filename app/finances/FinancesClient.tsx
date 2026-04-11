'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, RefreshCw, Plus, X, ChevronUp, ChevronDown } from 'lucide-react'

// ─── Formatters ───────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(n)

const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return fmt(n)
}

const fmtPrice = (n: number) => n.toLocaleString('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
})

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

const TYPE_LABEL: Record<string, string> = {
  depository: 'Cash', investment: 'Investment', credit: 'Credit', loan: 'Loan',
}

const TYPE_COLOR: Record<string, string> = {
  depository: '#3ddc84', investment: '#4d9fff', credit: '#ff6b6b', loan: '#f5a623',
}

const BUCKET_COLORS: Record<string, string> = {
  'AI Core': '#4d9fff', 'Energy': '#3ddc84', 'Nuclear': '#9d7cf4', 'Obscure': '#f5a623',
}

const ACCOUNT_TYPES = ['Real Estate', 'Private Equity', 'Venture', 'Angel', 'Debt', 'Other']

// ─── Custom Tooltip ───────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-3 border border-border rounded-lg px-3 py-2 text-xs shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      <div className="text-text-tertiary mb-1.5 font-mono">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-text-secondary">{p.name}</span>
          <span className="font-mono ml-auto pl-4" style={{ color: p.color }}>
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Hero KPI Card ────────────────────────────────────────────
function HeroKPI({ value, label, sub, trend }: {
  value: string; label: string; sub?: string | null; trend?: number | null
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-light font-mono tracking-tight text-text-primary tabular">{value}</span>
        {trend != null && (
          <span className={`flex items-center gap-0.5 text-xs font-mono ${trend >= 0 ? 'text-accent' : 'text-accent-red'}`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <span className="text-[11px] text-text-tertiary uppercase tracking-[0.12em] font-mono">{label}</span>
      {sub && <span className="text-xs text-text-tertiary font-mono">{sub}</span>}
    </div>
  )
}

// ─── Mini KPI ─────────────────────────────────────────────────
function MiniKPI({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 bg-surface-3 rounded-xl border border-border">
      <span className="text-lg font-light font-mono tabular" style={{ color }}>{value}</span>
      <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-mono">{label}</span>
    </div>
  )
}

// ─── Stock Portfolio ──────────────────────────────────────────
function StockPortfolio({ onDataLoad }: { onDataLoad: (d: any) => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editPosition, setEditPosition] = useState<any>(null)
  const [editForm, setEditForm] = useState({ shares: '', cost_basis: '', bucket: 'AI Core', dip_trigger: '', target_allocation: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ ticker: '', shares: '', cost_basis: '', bucket: 'AI Core', dip_trigger: '', target_allocation: '' })
  const [warChestInput, setWarChestInput] = useState('0')
  const [savingWarChest, setSavingWarChest] = useState(false)
  const [sortCol, setSortCol] = useState<string>('currentValue')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetch('/api/stocks').then(r => r.json()).then(res => {
      setData(res)
      onDataLoad(res)
      setWarChestInput(res.warChest?.toString() ?? '0')
    }).finally(() => setLoading(false))
  }, [])

  async function refresh() {
    setRefreshing(true)
    const res = await fetch('/api/stocks?refresh=true').then(r => r.json())
    setData(res)
    onDataLoad(res)
    setRefreshing(false)
  }

  async function savePosition() {
    if (!editPosition) return
    await fetch('/api/stocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'position',
        ticker: editPosition.ticker,
        shares: parseFloat(editForm.shares),
        cost_basis: parseFloat(editForm.cost_basis),
        bucket: editForm.bucket,
        dip_trigger: editForm.dip_trigger ? parseFloat(editForm.dip_trigger) : null,
        target_allocation: editForm.target_allocation ? parseFloat(editForm.target_allocation) : null,
      }),
    })
    const res = await fetch('/api/stocks').then(r => r.json())
    setData(res); onDataLoad(res); setEditPosition(null)
  }

  async function addPosition() {
    if (!addForm.ticker) return
    await fetch('/api/stocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'position',
        ticker: addForm.ticker.toUpperCase(),
        shares: parseFloat(addForm.shares) || 0,
        cost_basis: parseFloat(addForm.cost_basis) || 0,
        bucket: addForm.bucket,
        dip_trigger: addForm.dip_trigger ? parseFloat(addForm.dip_trigger) : null,
        target_allocation: addForm.target_allocation ? parseFloat(addForm.target_allocation) : null,
      }),
    })
    const res = await fetch('/api/stocks?refresh=true').then(r => r.json())
    setData(res); onDataLoad(res)
    setShowAdd(false)
    setAddForm({ ticker: '', shares: '', cost_basis: '', bucket: 'AI Core', dip_trigger: '', target_allocation: '' })
  }

  async function deleteTicker(ticker: string) {
    if (!confirm(`Remove ${ticker} from portfolio?`)) return
    await fetch(`/api/stocks?ticker=${ticker}`, { method: 'DELETE' })
    const res = await fetch('/api/stocks').then(r => r.json())
    setData(res); onDataLoad(res)
  }

  async function saveWarChest() {
    setSavingWarChest(true)
    await fetch('/api/stocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'war_chest', war_chest: parseFloat(warChestInput) }),
    })
    setSavingWarChest(false)
  }

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  if (loading) return (
    <>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-surface-2 border border-border rounded-xl p-5 animate-pulse">
          <div className="h-4 bg-surface-3 rounded w-1/3 mb-3" />
          <div className="h-8 bg-surface-3 rounded w-1/2" />
        </div>
      ))}
    </>
  )

  if (!data) return null

  const sortedHoldings = [...(data.holdings ?? [])].sort((a: any, b: any) => {
    const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const dailyPnL = data.holdings?.reduce((s: number, h: any) => s + (h.shares * h.dailyChange), 0) ?? 0
  const topMover = [...(data.holdings ?? [])].sort((a: any, b: any) => Math.abs(b.dailyChangePct) - Math.abs(a.dailyChangePct))[0]

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ChevronDown size={10} className="text-text-dim" />
    return sortDir === 'desc' ? <ChevronDown size={10} className="text-accent" /> : <ChevronUp size={10} className="text-accent" />
  }

  const BUCKETS = ['AI Core', 'Energy', 'Nuclear', 'Obscure', 'Other']

  return (
    <>
      {/* Left — Portfolio summary */}
      <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#161616', border: '1px solid #242424', borderLeft: '2px solid #4d9fff' }}>
        <div className="flex items-center justify-between">
          <span className="widget-label">Portfolio</span>
          <button onClick={refresh} disabled={refreshing}
            className="btn-ghost">
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'updating' : 'refresh'}
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="text-3xl font-light font-mono tabular text-text-primary tracking-tight">
            {fmt(data.totalValue)}
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1 text-sm font-mono ${data.totalGainLoss >= 0 ? 'text-accent' : 'text-accent-red'}`}>
              {data.totalGainLoss >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {fmtCompact(data.totalGainLoss)}
              <span className="text-text-tertiary text-xs">total</span>
            </span>
          </div>
          <div className={`text-sm font-mono flex items-center gap-1 ${dailyPnL >= 0 ? 'text-accent' : 'text-accent-red'}`}>
            {dailyPnL >= 0 ? '+' : ''}{fmtCompact(dailyPnL)}
            <span className="text-text-tertiary text-xs ml-0.5">today</span>
          </div>
        </div>

        {topMover && (
          <div className="bg-surface-3 rounded-lg p-3 border border-border">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5 font-mono">Top mover</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-semibold text-text-primary">{topMover.ticker}</span>
              <span className={`text-sm font-mono font-medium ${topMover.dailyChangePct >= 0 ? 'text-accent' : 'text-accent-red'}`}>
                {fmtPct(topMover.dailyChangePct)}
              </span>
            </div>
          </div>
        )}

        {/* Allocation bars */}
        <div className="flex flex-col gap-2.5 pt-1 border-t border-border">
          <span className="widget-label">Allocation</span>
          {(data.allocations ?? []).map((a: any) => (
            <div key={a.bucket} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">{a.bucket}</span>
                <div className="flex items-center gap-2">
                  {a.target > 0 && <span className="text-[10px] font-mono text-text-dim">t:{a.target}%</span>}
                  <span className="text-[10px] font-mono font-medium"
                    style={{
                      color: a.target > 0
                        ? Math.abs(a.current - a.target) <= 2 ? '#3ddc84'
                          : Math.abs(a.current - a.target) <= 5 ? '#f5a623' : '#ff6b6b'
                        : '#909090'
                    }}>
                    {a.current.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="relative h-1.5 bg-surface-4 rounded-full overflow-hidden">
                {a.target > 0 && (
                  <div className="absolute top-0 bottom-0 w-px bg-surface-4 z-10"
                    style={{ left: `${Math.min(a.target, 99)}%` }} />
                )}
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(a.current, 100)}%`,
                    backgroundColor: BUCKET_COLORS[a.bucket] ?? '#909090',
                    opacity: 0.8,
                  }} />
              </div>
            </div>
          ))}
        </div>

        {/* War chest */}
        <div className="flex flex-col gap-2 pt-1 border-t border-border">
          <span className="widget-label">War chest</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-tertiary font-mono">$</span>
            <input
              value={warChestInput}
              onChange={e => setWarChestInput(e.target.value)}
              onBlur={saveWarChest}
              disabled={savingWarChest}
              className="flex-1 bg-surface-3 border border-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-text-primary focus:outline-none focus:border-border-strong text-right"
            />
          </div>
          {/* Dip triggers */}
          <div className="flex flex-col gap-1.5">
            {(data.holdings ?? []).filter((h: any) => h.dipTrigger).map((h: any) => (
              <div key={h.ticker} className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-text-primary">{h.ticker}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-tertiary">≤{fmtPrice(h.dipTrigger)}</span>
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${h.atDip ? 'bg-accent-red/10 text-accent-red' : 'bg-accent/10 text-accent'}`}>
                    {fmtPrice(h.currentPrice)} {h.atDip ? '🔴 BUY' : '✓'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-text-dim font-mono">
          {data.pricesUpdatedAt ? `Updated ${new Date(data.pricesUpdatedAt).toLocaleTimeString()}` : ''}
        </div>
      </div>

      {/* Center — Holdings table */}
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="widget-label">Holdings</span>
          <button onClick={() => setShowAdd(true)}
            className="btn-ghost">
            <Plus size={11} /> add ticker
          </button>
        </div>

        {/* Add ticker form */}
        {showAdd && (
          <div className="px-5 py-4 border-b border-border bg-surface-3 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="widget-label">Ticker</label>
                <input value={addForm.ticker} onChange={e => setAddForm(p => ({ ...p, ticker: e.target.value.toUpperCase() }))}
                  placeholder="NVDA" className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-text-primary focus:outline-none focus:border-border-strong uppercase" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="widget-label">Shares</label>
                <input type="number" value={addForm.shares} onChange={e => setAddForm(p => ({ ...p, shares: e.target.value }))}
                  placeholder="0" className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-text-primary focus:outline-none focus:border-border-strong" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="widget-label">Cost basis</label>
                <input type="number" value={addForm.cost_basis} onChange={e => setAddForm(p => ({ ...p, cost_basis: e.target.value }))}
                  placeholder="0.00" className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-text-primary focus:outline-none focus:border-border-strong" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="widget-label">Bucket</label>
                <select value={addForm.bucket} onChange={e => setAddForm(p => ({ ...p, bucket: e.target.value }))}
                  className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none">
                  {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="widget-label">Dip trigger ($)</label>
                <input type="number" value={addForm.dip_trigger} onChange={e => setAddForm(p => ({ ...p, dip_trigger: e.target.value }))}
                  placeholder="optional" className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-text-primary focus:outline-none focus:border-border-strong" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="widget-label">Target alloc (%)</label>
                <input type="number" value={addForm.target_allocation} onChange={e => setAddForm(p => ({ ...p, target_allocation: e.target.value }))}
                  placeholder="optional" className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-text-primary focus:outline-none focus:border-border-strong" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={addPosition} className="btn-primary text-xs py-1.5">Add ticker</button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {[
                  { col: 'ticker', label: 'Ticker' },
                  { col: 'bucket', label: 'Bucket' },
                  { col: 'shares', label: 'Shares' },
                  { col: 'costBasis', label: 'Cost' },
                  { col: 'currentPrice', label: 'Price' },
                  { col: 'currentValue', label: 'Value' },
                  { col: 'gainLoss', label: 'P&L' },
                  { col: 'dailyChangePct', label: 'Day' },
                ].map(({ col, label }) => (
                  <th key={col}
                    onClick={() => toggleSort(col)}
                    className="text-left px-3 py-2.5 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary cursor-pointer hover:text-text-secondary select-none">
                    <span className="flex items-center gap-1">
                      {label} <SortIcon col={col} />
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {sortedHoldings.map((h: any, i: number) => (
                <tr key={h.ticker}
                  className={`border-b border-border last:border-0 hover:bg-surface-3 transition-colors cursor-pointer group ${i % 2 === 0 ? '' : 'bg-[#111111]/40'}`}
                  onClick={() => {
                    setEditPosition(h)
                    setEditForm({
                      shares: h.shares.toString(),
                      cost_basis: h.costBasis.toString(),
                      bucket: h.bucket,
                      dip_trigger: h.dipTrigger?.toString() ?? '',
                      target_allocation: h.targetAllocation?.toString() ?? '',
                    })
                  }}>
                  <td className="px-3 py-2.5 font-mono font-semibold text-text-primary">{h.ticker}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: (BUCKET_COLORS[h.bucket] ?? '#888') + '20', color: BUCKET_COLORS[h.bucket] ?? '#888' }}>
                      {h.bucket}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-text-secondary">{h.shares || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-text-secondary">{h.costBasis ? fmtPrice(h.costBasis) : '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-text-primary">{fmtPrice(h.currentPrice)}</td>
                  <td className="px-3 py-2.5 font-mono text-text-primary font-medium">{h.currentValue > 0 ? fmt(h.currentValue) : '—'}</td>
                  <td className="px-3 py-2.5">
                    {h.shares > 0 ? (
                      <div>
                        <div className={`font-mono text-xs ${h.gainLoss >= 0 ? 'text-accent' : 'text-accent-red'}`}>
                          {h.gainLoss >= 0 ? '+' : ''}{fmtCompact(h.gainLoss)}
                        </div>
                        <div className={`text-[10px] font-mono ${h.gainLossPct >= 0 ? 'text-accent' : 'text-accent-red'}`}>
                          {fmtPct(h.gainLossPct)}
                        </div>
                      </div>
                    ) : <span className="text-text-dim">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`font-mono font-semibold text-xs px-1.5 py-0.5 rounded ${h.dailyChangePct >= 0 ? 'bg-accent/10 text-accent' : 'bg-accent-red/10 text-accent-red'}`}>
                      {fmtPct(h.dailyChangePct)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={e => { e.stopPropagation(); deleteTicker(h.ticker) }}
                      className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-accent-red transition-all">
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 border-t border-border text-[10px] text-text-dim font-mono">
          Click any row to edit · Click column headers to sort
        </div>
      </div>

      {/* Edit modal */}
      {editPosition && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={() => setEditPosition(null)}>
          <div className="bg-surface-2 border border-border rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-text-primary font-semibold text-lg font-mono">{editPosition.ticker}</h3>
                <p className="text-text-tertiary text-xs mt-0.5">{editPosition.bucket}</p>
              </div>
              <button onClick={() => setEditPosition(null)} className="text-text-tertiary hover:text-text-primary text-xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Shares', key: 'shares', placeholder: '0' },
                { label: 'Cost basis (per share)', key: 'cost_basis', placeholder: '0.00' },
                { label: 'Dip trigger ($)', key: 'dip_trigger', placeholder: 'optional' },
                { label: 'Target allocation (%)', key: 'target_allocation', placeholder: 'optional' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="widget-label">{label}</label>
                  <input type="number"
                    value={(editForm as any)[key]}
                    onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-border-strong" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Bucket</label>
              <select value={editForm.bucket} onChange={e => setEditForm(p => ({ ...p, bucket: e.target.value }))}
                className="bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
                {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="bg-surface-3 rounded-lg p-3 text-xs font-mono text-text-secondary border border-border">
              {editForm.shares && editForm.cost_basis
                ? `Value: ${fmt(parseFloat(editForm.shares) * editPosition.currentPrice)} · Cost: ${fmt(parseFloat(editForm.shares) * parseFloat(editForm.cost_basis))}`
                : `Current: ${fmtPrice(editPosition.currentPrice)}`}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={savePosition} className="btn-primary flex-1">Save position</button>
              <button onClick={() => setEditPosition(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Manual Accounts ──────────────────────────────────────────
function ManualAccounts({ onTotalChange }: { onTotalChange: (total: number) => void }) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editAccount, setEditAccount] = useState<any>(null)
  const [form, setForm] = useState({ name: '', account_type: 'Real Estate', balance: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/finance/manual').then(r => r.json()).then(res => {
      const data = res.data ?? []
      setAccounts(data)
      onTotalChange(data.reduce((s: number, a: any) => s + a.balance, 0))
    }).finally(() => setLoading(false))
  }, [])

  function updateTotal(updated: any[]) {
    setAccounts(updated)
    onTotalChange(updated.reduce((s, a) => s + a.balance, 0))
  }

  async function save() {
    setSaving(true)
    if (editAccount) {
      const res = await fetch('/api/finance/manual', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editAccount.id, ...form, balance: parseFloat(form.balance) }),
      }).then(r => r.json())
      if (res.data) updateTotal(accounts.map(a => a.id === res.data.id ? res.data : a))
      setEditAccount(null)
    } else {
      const res = await fetch('/api/finance/manual', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, balance: parseFloat(form.balance) }),
      }).then(r => r.json())
      if (res.data) updateTotal([...accounts, res.data])
      setShowAdd(false)
    }
    setForm({ name: '', account_type: 'Real Estate', balance: '' })
    setSaving(false)
  }

  async function deleteAccount(id: string) {
    await fetch(`/api/finance/manual?id=${id}`, { method: 'DELETE' })
    updateTotal(accounts.filter(a => a.id !== id))
  }

  const total = accounts.reduce((s, a) => s + a.balance, 0)

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#161616', border: '1px solid #242424', borderLeft: '2px solid #f5a623' }}>
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="widget-label">Investment accounts</span>
          {total > 0 && <span className="text-sm font-mono text-accent-amber">{fmt(total)}</span>}
        </div>
        <button onClick={() => { setShowAdd(true); setEditAccount(null); setForm({ name: '', account_type: 'Real Estate', balance: '' }) }}
          className="btn-ghost"><Plus size={11} /> add</button>
      </div>

      {loading && <div className="px-5 py-4 text-xs text-text-tertiary animate-pulse">Loading...</div>}

      {!loading && accounts.length === 0 && !showAdd && (
        <div className="px-5 py-8 text-xs text-text-tertiary text-center">No investment accounts yet</div>
      )}

      {accounts.map(account => (
        <div key={account.id}
          className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 hover:bg-surface-3 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-amber flex-shrink-0" />
            <div>
              <div className="text-sm text-text-primary">{account.name}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5 font-mono">{account.account_type}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-mono text-accent-amber">{fmt(account.balance)}</div>
            <button onClick={() => { setEditAccount(account); setShowAdd(false); setForm({ name: account.name, account_type: account.account_type, balance: account.balance.toString() }) }}
              className="opacity-0 group-hover:opacity-100 btn-ghost text-[10px]">edit</button>
            <button onClick={() => deleteAccount(account.id)}
              className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-accent-red transition-all"><X size={12} /></button>
          </div>
        </div>
      ))}

      {(showAdd || editAccount) && (
        <div className="px-5 py-4 border-t border-border bg-surface-3 flex flex-col gap-3">
          <span className="widget-label">{editAccount ? 'Edit account' : 'New account'}</span>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="widget-label">Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Fundrise" className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Type</label>
              <select value={form.account_type} onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))}
                className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Amount ($)</label>
              <input type="number" value={form.balance} onChange={e => setForm(p => ({ ...p, balance: e.target.value }))}
                placeholder="0" className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving || !form.name || !form.balance} className="btn-primary text-xs py-1.5">
              {saving ? 'Saving...' : editAccount ? 'Update' : 'Add account'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditAccount(null) }} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
interface Props { snapshots: any[]; isConnected: boolean }

export function FinancesClient({ snapshots, isConnected }: Props) {
  const [financeData, setFinanceData] = useState<any>(null)
  const [portfolioData, setPortfolioData] = useState<any>(null)
  const [manualTotal, setManualTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected) {
      fetch('/api/finance').then(r => r.json()).then(res => {
        if (res.data) setFinanceData(res.data)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isConnected])

  async function openPlaidLink() {
    setLinking(true)
    setError(null)
    try {
      const tokenRes = await fetch('/api/finance/link-token', { method: 'POST' }).then(r => r.json())
      if (tokenRes.error) throw new Error(tokenRes.error)

      await new Promise<void>((resolve, reject) => {
        if ((window as any).Plaid) { resolve(); return }
        const script = document.createElement('script')
        script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Plaid'))
        document.head.appendChild(script)
      })

      const handler = (window as any).Plaid.create({
        token: tokenRes.link_token,
        onSuccess: async (public_token: string) => {
          const res = await fetch('/api/finance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token }),
          }).then(r => r.json())
          if (res.error) throw new Error(res.error)
          const fresh = await fetch('/api/finance').then(r => r.json())
          if (fresh.data) setFinanceData(fresh.data)
          setLinking(false)
        },
        onExit: () => setLinking(false),
      })
      handler.open()
    } catch (err: any) {
      setError(err.message)
      setLinking(false)
    }
  }

  const netWorth = financeData
    ? financeData.net_worth + (portfolioData?.totalValue ?? 0) + manualTotal
    : null

  const chartData = [...snapshots].slice(0, 30).reverse().map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    'Net Worth': Math.round(s.net_worth),
    'Cash': Math.round(s.total_cash),
    'Invested': Math.round(s.total_investments),
  }))

  return (
    <div className="flex flex-col gap-6 max-w-7xl pb-10 animate-in">

      {/* ── Hero KPI Section ── */}
      <div className="rounded-2xl p-6" style={{ background: '#161616', border: '1px solid #242424', borderLeft: '3px solid #3ddc84', boxShadow: '0 2px 12px rgba(0,0,0,0.4), 0 0 40px rgba(61,220,132,0.03)' }}>
        <div className="flex items-start justify-between gap-6">
          {/* Net worth hero */}
          <div className="flex flex-col gap-1">
            <HeroKPI
              value={netWorth != null ? fmtCompact(netWorth) : '—'}
              label="Net Worth"
            />
            {financeData && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-text-dim font-mono">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          {/* Mini KPIs */}
          <div className="grid grid-cols-4 gap-3 flex-1 max-w-2xl">
            <MiniKPI
              value={financeData ? fmtCompact(financeData.total_investments) : '—'}
              label="Invested"
              color="#4d9fff"
            />
            <MiniKPI
              value={financeData ? fmtCompact(financeData.total_cash) : '—'}
              label="Cash"
              color="#3ddc84"
            />
            <MiniKPI
              value={financeData ? fmtCompact(financeData.total_credit_balance) : '—'}
              label="Credit"
              color="#ff6b6b"
            />
            <MiniKPI
              value={portfolioData ? fmtCompact(portfolioData.totalValue) : '—'}
              label="Portfolio"
              color="#4d9fff"
            />
          </div>

          {/* Connect button */}
          <button onClick={openPlaidLink} disabled={linking}
            className="btn-connect flex-shrink-0 text-xs">
            {linking ? 'Connecting...' : isConnected ? '+ add account' : 'Connect Plaid'}
          </button>
        </div>

        {/* Inline sparkline */}
        {chartData.length > 1 && (
          <div className="mt-5 pt-4 border-t border-border">
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3ddc84" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3ddc84" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#505050' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#505050' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Net Worth" stroke="#3ddc84" strokeWidth={1.5}
                  fill="url(#netWorthGrad)" dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {error && <div className="mt-3 text-xs text-accent-red font-mono">{error}</div>}
      </div>

      {/* ── Stock Portfolio ── */}
      <div className="grid grid-cols-3 gap-4">
        <StockPortfolio onDataLoad={setPortfolioData} />
      </div>

      {/* ── Bank Accounts ── */}
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden border-l-[2px] border-l-accent">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="widget-label">Bank accounts</span>
          <button onClick={openPlaidLink} disabled={linking} className="btn-ghost text-[10px]">
            {linking ? 'Connecting...' : isConnected ? '+ add account' : 'Connect Plaid'}
          </button>
        </div>

        {!isConnected && !financeData ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="text-text-secondary text-sm">Connect your bank accounts</div>
            {error && <div className="text-accent-red text-xs font-mono">{error}</div>}
            <button onClick={openPlaidLink} disabled={linking} className="btn-primary">
              {linking ? 'Connecting...' : 'Connect with Plaid'}
            </button>
          </div>
        ) : loading ? (
          <div className="px-5 py-6 text-xs text-text-tertiary animate-pulse">Loading accounts...</div>
        ) : financeData?.accounts ? (
          financeData.accounts.map((account: any, i: number) => (
            <div key={account.id}
              className={`flex items-center justify-between px-5 py-3.5 border-b border-border last:border-0 hover:bg-surface-3 transition-colors ${i % 2 === 0 ? '' : 'bg-[#111111]/30'}`}>
              <div className="flex items-center gap-3.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TYPE_COLOR[account.type] ?? '#888', boxShadow: `0 0 6px ${TYPE_COLOR[account.type] ?? '#888'}40` }} />
                <div>
                  <div className="text-sm text-text-primary">{account.name}</div>
                  <div className="text-[10px] text-text-tertiary font-mono mt-0.5">
                    {TYPE_LABEL[account.type] ?? account.type} · ••{account.mask}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-medium" style={{ color: TYPE_COLOR[account.type] ?? '#f0f0f0' }}>
                  {fmt(account.balance)}
                </div>
                {account.available_balance !== null && account.available_balance !== account.balance && (
                  <div className="text-[10px] text-text-tertiary font-mono mt-0.5">
                    {fmt(account.available_balance)} avail.
                  </div>
                )}
              </div>
            </div>
          ))
        ) : null}
      </div>

      {/* ── Investment Accounts ── */}
      <ManualAccounts onTotalChange={setManualTotal} />

      {/* ── Extended Net Worth Chart ── */}
      {chartData.length > 1 && (
        <div className="bg-surface-2 border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="widget-label">Net worth trend</span>
            <span className="text-[10px] text-text-tertiary font-mono">30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#505050' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#505050' }} tickLine={false} axisLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Net Worth" stroke="#3ddc84" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="Cash" stroke="#4d9fff" strokeWidth={1.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="Invested" stroke="#9d7cf4" strokeWidth={1.5} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3">
            {[['Net Worth', '#3ddc84'], ['Cash', '#4d9fff'], ['Invested', '#9d7cf4']].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-text-tertiary font-mono">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
