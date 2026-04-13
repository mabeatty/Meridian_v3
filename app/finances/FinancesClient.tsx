'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Formatters ───────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
const fmtCompact = (n: number) => { if (Math.abs(n) >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`; if (Math.abs(n) >= 1_000) return `$${(n/1_000).toFixed(0)}K`; return fmt(n) }
const fmtPrice = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

const ACCOUNT_TYPES = ['Real Estate', 'Private Equity', 'Venture', 'Angel', 'Debt', 'Other']
const BUCKETS = ['AI Core', 'Energy', 'Nuclear', 'Obscure', 'Other']
const BUCKET_COLORS: Record<string, string> = { 'AI Core': '#4d9fff', 'Energy': '#3ddc84', 'Nuclear': '#9d7cf4', 'Obscure': '#f5a623' }
const TYPE_COLOR: Record<string, string> = { depository: '#3ddc84', investment: '#4d9fff', credit: '#ff6b6b', loan: '#f5a623' }
const TYPE_LABEL: Record<string, string> = { depository: 'Cash', investment: 'Investment', credit: 'Credit', loan: 'Loan' }

// ─── Sparkline ────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, h = canvas.height
    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 4) - 2
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [data, color])
  return <canvas ref={canvasRef} width={80} height={24} style={{ display: 'block' }} />
}

// ─── Bar Chart ────────────────────────────────────────────────
function SpendingChart({ period, onPeriodChange }: { period: string; onPeriodChange: (p: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    setLoading(true)
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12
    fetch(`/api/budget/history?months=${months}`)
      .then(r => r.json())
      .then(res => setData(res.data ?? []))
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const w = canvas.width = canvas.offsetWidth * window.devicePixelRatio
    const h = canvas.height = canvas.offsetHeight * window.devicePixelRatio
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    const cw = canvas.offsetWidth, ch = canvas.offsetHeight

    ctx.clearRect(0, 0, cw, ch)

    const padL = 44, padR = 8, padT = 8, padB = 28
    const chartW = cw - padL - padR
    const chartH = ch - padT - padB

    const maxVal = Math.max(...data.map((d: any) => Math.max(d.spent, d.budget)), 1)
    const maxBudget = data[0]?.budget ?? 0

    // Grid lines
    ctx.strokeStyle = 'rgba(128,128,128,0.12)'
    ctx.lineWidth = 0.5
    const gridLines = 4
    for (let i = 0; i <= gridLines; i++) {
      const y = padT + chartH - (i / gridLines) * chartH
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(padL + chartW, y)
      ctx.stroke()
      // Y label
      ctx.fillStyle = 'rgba(128,128,128,0.7)'
      ctx.font = '10px var(--font-mono, monospace)'
      ctx.textAlign = 'right'
      const val = (i / gridLines) * maxVal
      ctx.fillText('$' + (val >= 1000 ? (val/1000).toFixed(0) + 'k' : val.toFixed(0)), padL - 4, y + 3)
    }

    const barW = Math.max(8, (chartW / data.length) * 0.55)
    const gap = chartW / data.length

    data.forEach((d: any, i: number) => {
      const x = padL + i * gap + gap / 2
      const barH = (d.spent / maxVal) * chartH
      const barY = padT + chartH - barH
      const overBudget = maxBudget > 0 && d.spent > maxBudget

      // Bar
      ctx.fillStyle = overBudget ? '#ff6b6b' : '#4d9fff'
      const radius = 3
      ctx.beginPath()
      ctx.moveTo(x - barW/2 + radius, barY)
      ctx.lineTo(x + barW/2 - radius, barY)
      ctx.quadraticCurveTo(x + barW/2, barY, x + barW/2, barY + radius)
      ctx.lineTo(x + barW/2, padT + chartH)
      ctx.lineTo(x - barW/2, padT + chartH)
      ctx.lineTo(x - barW/2, barY + radius)
      ctx.quadraticCurveTo(x - barW/2, barY, x - barW/2 + radius, barY)
      ctx.closePath()
      ctx.fill()

      // X label
      ctx.fillStyle = 'rgba(128,128,128,0.8)'
      ctx.font = '10px var(--font-sans, sans-serif)'
      ctx.textAlign = 'center'
      ctx.fillText(d.label, x, padT + chartH + 16)
    })

    // Budget line
    if (maxBudget > 0) {
      const budgetY = padT + chartH - (maxBudget / maxVal) * chartH
      ctx.strokeStyle = '#f5a623'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(padL, budgetY)
      ctx.lineTo(padL + chartW, budgetY)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [data])

  return (
    <div style={{ background: '#444444', border: '1px solid #242424', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>Spending vs budget</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['3m','6m','12m'].map(p => (
            <button key={p} onClick={() => onPeriodChange(p)}
              style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: '0.5px solid', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                borderColor: period === p ? 'transparent' : '#626262',
                background: period === p ? '#1a2d4d' : 'transparent',
                color: period === p ? '#4d9fff' : '#c0c0c0' }}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0c0c0', fontSize: '12px' }}>Loading...</div>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: '180px' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#c0c0c0' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#4d9fff', display: 'inline-block' }} />Spent
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '2px', background: '#f5a623', display: 'inline-block' }} />Budget
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ff6b6b', display: 'inline-block' }} />Over budget
        </span>
      </div>
    </div>
  )
}

// ─── Account Groups ───────────────────────────────────────────
function AccountGroups({ finance, manualAccounts, portfolio }: { finance: any; manualAccounts: any[]; portfolio: any }) {
  const groups: { label: string; sub: string; value: number; color: string; change?: string; changePos?: boolean }[] = []

  if (portfolio?.totalValue > 0) {
    const dailyPnL = portfolio.holdings?.reduce((s: number, h: any) => s + (h.shares * h.dailyChange), 0) ?? 0
    groups.push({
      label: 'Stock portfolio',
      sub: portfolio.holdings?.map((h: any) => h.ticker).slice(0, 4).join(', ') + (portfolio.holdings?.length > 4 ? ` +${portfolio.holdings.length - 4}` : ''),
      value: portfolio.totalValue,
      color: '#4d9fff',
      change: `${dailyPnL >= 0 ? '+' : ''}${fmtCompact(dailyPnL)} today`,
      changePos: dailyPnL >= 0,
    })
  }

  // Group manual accounts by type
  const grouped: Record<string, number> = {}
  for (const a of manualAccounts) {
    grouped[a.account_type] = (grouped[a.account_type] ?? 0) + a.balance
  }
  const typeColors: Record<string, string> = {
    'Real Estate': '#f5a623', 'Private Equity': '#9d7cf4', 'Venture': '#9d7cf4',
    'Angel': '#9d7cf4', 'Debt': '#ff6b6b', 'Other': '#888'
  }
  for (const [type, val] of Object.entries(grouped)) {
    if (val > 0) groups.push({ label: type, sub: 'manual', value: val, color: typeColors[type] ?? '#888' })
  }

  if (finance?.total_cash > 0) {
    groups.push({ label: 'Cash accounts', sub: `${finance.accounts?.filter((a: any) => a.type === 'depository').length ?? 0} linked`, value: finance.total_cash, color: '#3ddc84' })
  }

  if (finance?.total_credit_balance > 0) {
    groups.push({ label: 'Credit', sub: 'balance due', value: finance.total_credit_balance, color: '#ff6b6b' })
  }

  return (
    <div style={{ background: '#444444', border: '1px solid #242424', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0c0c0', fontFamily: 'DM Mono, monospace', marginBottom: '12px' }}>
        Accounts & holdings
      </div>
      {groups.map((g, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < groups.length - 1 ? '0.5px solid #242424' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: g.color, flexShrink: 0, boxShadow: `0 0 6px ${g.color}60` }} />
            <div>
              <div style={{ fontSize: '13px', color: '#f0f0f0' }}>{g.label}</div>
              <div style={{ fontSize: '11px', color: '#c0c0c0', marginTop: '1px', fontFamily: 'DM Mono, monospace' }}>{g.sub}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'DM Mono, monospace', color: g.label === 'Credit' ? '#ff6b6b' : '#f0f0f0' }}>{fmtCompact(g.value)}</div>
            {g.change && <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: g.changePos ? '#3ddc84' : '#ff6b6b', marginTop: '1px' }}>{g.change}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Spending Categories ──────────────────────────────────────
function SpendingCategories() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7)
    fetch(`/api/budget/summary?month=${month}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const cats = (data?.summary ?? [])
    .filter((c: any) => c.name !== 'Transfer / Excluded' && c.spent > 0)
    .sort((a: any, b: any) => b.spent - a.spent)
    .slice(0, 7)

  const maxSpent = Math.max(...cats.map((c: any) => c.spent), 1)
  const pct = data?.totalBudget > 0 ? Math.min((data.totalSpent / data.totalBudget) * 100, 100) : 0

  return (
    <div style={{ background: '#444444', border: '1px solid #242424', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>This month</span>
        {data && <span style={{ fontSize: '12px', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>{fmtCompact(data.totalSpent)} of {fmtCompact(data.totalBudget)}</span>}
      </div>

      {/* Budget progress bar */}
      {data && (
        <div style={{ height: '5px', background: '#525252', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: '3px', background: pct >= 100 ? '#ff6b6b' : pct >= 85 ? '#f5a623' : '#4d9fff', transition: 'width 0.5s ease' }} />
        </div>
      )}

      {loading && <div style={{ color: '#c0c0c0', fontSize: '12px' }}>Loading...</div>}

      {/* Category bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {cats.map((c: any) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '80px', fontSize: '12px', color: '#c0c0c0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{c.name}</div>
            <div style={{ flex: 1, height: '5px', background: '#525252', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(c.spent / maxSpent) * 100}%`, borderRadius: '3px', background: c.color ?? '#4d9fff', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ width: '56px', fontSize: '12px', fontFamily: 'DM Mono, monospace', color: '#f0f0f0', textAlign: 'right', flexShrink: 0 }}>{fmtCompact(c.spent)}</div>
          </div>
        ))}
      </div>

      {!loading && cats.length === 0 && (
        <div style={{ fontSize: '13px', color: '#c0c0c0' }}>No spending this month yet</div>
      )}
    </div>
  )
}

// ─── Equity Performance ───────────────────────────────────────
function EquityPerformance({ holdings, refreshing, onRefresh, onPositionAdded }: { holdings: any[]; refreshing: boolean; onRefresh: () => void; onPositionAdded: () => void }) {
  const dailyTotal = holdings.reduce((s, h) => s + (h.shares * h.dailyChange), 0)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ ticker: '', shares: '', cost_basis: '', bucket: 'AI Core' })
  const [adding, setAdding] = useState(false)

  const BUCKETS = ['AI Core', 'Energy', 'Nuclear', 'Obscure', 'Other']
  const inputStyle = { background: '#4e4e4e', border: '0.5px solid #626262', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', color: '#f0f0f0', outline: 'none', width: '100%', fontFamily: 'DM Mono, monospace' }

  async function addPosition() {
    if (!addForm.ticker.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'position',
          ticker: addForm.ticker.toUpperCase().trim(),
          shares: parseFloat(addForm.shares) || 0,
          cost_basis: parseFloat(addForm.cost_basis) || 0,
          bucket: addForm.bucket,
        }),
      })
      const json = await res.json()
      console.log('addPosition response:', res.status, json)
      if (!res.ok) {
        alert('Error saving position: ' + (json.error ?? res.status))
        setAdding(false)
        return
      }
    } catch (err) {
      console.error('addPosition error:', err)
      alert('Network error: ' + err)
      setAdding(false)
      return
    }
    setAddForm({ ticker: '', shares: '', cost_basis: '', bucket: 'AI Core' })
    setShowAdd(false)
    setAdding(false)
    onPositionAdded() // calls refreshStocks which already uses refresh=true
  }

  return (
    <div style={{ background: '#444444', border: '1px solid #525252', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>Equity today</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontFamily: 'DM Mono, monospace', color: dailyTotal >= 0 ? '#3ddc84' : '#ff6b6b', fontWeight: 500 }}>
            {dailyTotal >= 0 ? '+' : ''}{fmtCompact(dailyTotal)}
          </span>
          <button onClick={() => setShowAdd(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#c0c0c0', background: '#4e4e4e', border: '0.5px solid #626262', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>
            <Plus size={10} /> Add
          </button>
          <button onClick={onRefresh} disabled={refreshing} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0c0c0', padding: 0, display: 'flex' }}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {showAdd && (
        <div style={{ background: '#4e4e4e', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#909090', marginBottom: '3px', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ticker</div>
              <input value={addForm.ticker} onChange={e => setAddForm(p => ({ ...p, ticker: e.target.value.toUpperCase() }))}
                onKeyDown={e => e.key === 'Enter' && addPosition()}
                placeholder="NVDA" style={inputStyle} autoFocus />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#909090', marginBottom: '3px', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shares</div>
              <input type="number" value={addForm.shares} onChange={e => setAddForm(p => ({ ...p, shares: e.target.value }))}
                placeholder="0" style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#909090', marginBottom: '3px', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cost basis</div>
              <input type="number" value={addForm.cost_basis} onChange={e => setAddForm(p => ({ ...p, cost_basis: e.target.value }))}
                placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#909090', marginBottom: '3px', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bucket</div>
              <select value={addForm.bucket} onChange={e => setAddForm(p => ({ ...p, bucket: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={addPosition} disabled={adding || !addForm.ticker.trim()}
              style={{ fontSize: '12px', padding: '5px 14px', borderRadius: '6px', background: '#f0f0f0', color: '#3a3a3a', border: 'none', cursor: 'pointer', fontWeight: 500, opacity: adding || !addForm.ticker.trim() ? 0.5 : 1 }}>
              {adding ? 'Adding...' : 'Add ticker'}
            </button>
            <button onClick={() => setShowAdd(false)}
              style={{ fontSize: '12px', padding: '5px 14px', borderRadius: '6px', background: 'transparent', color: '#c0c0c0', border: '0.5px solid #626262', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {holdings.length === 0 && !showAdd && <div style={{ fontSize: '13px', color: '#c0c0c0' }}>No positions yet — click Add to get started</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {holdings.map((h: any, i: number) => (
          <div key={h.ticker} style={{ display: 'flex', flexDirection: 'column', padding: '9px 0', borderBottom: i < holdings.length - 1 ? '0.5px solid #525252' : 'none', gap: '3px' }}>
            {/* Top line: ticker, sparkline, price, % */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '48px', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Mono, monospace', color: '#f0f0f0', flexShrink: 0 }}>{h.ticker}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Sparkline
                  data={[h.currentPrice * 0.985, h.currentPrice * 0.988, h.currentPrice * 0.991, h.currentPrice * 0.987, h.currentPrice * 0.993, h.currentPrice * 0.996, h.currentPrice * 0.994, h.currentPrice * 0.998, h.currentPrice]}
                  color={h.dailyChangePct >= 0 ? '#3ddc84' : '#ff6b6b'}
                />
              </div>
              <div style={{ width: '64px', fontSize: '12px', fontFamily: 'DM Mono, monospace', color: '#c0c0c0', textAlign: 'right', flexShrink: 0 }}>{fmtPrice(h.currentPrice)}</div>
              <div style={{ width: '56px', fontSize: '11px', fontFamily: 'DM Mono, monospace', fontWeight: 500, textAlign: 'right', padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
                color: h.dailyChangePct >= 0 ? '#1a7a3c' : '#a32d2d',
                background: h.dailyChangePct >= 0 ? '#eaf3de' : '#fcebeb' }}>
                {fmtPct(h.dailyChangePct)}
              </div>
            </div>
            {/* Bottom line: shares, cost basis, current value */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '56px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#909090' }}>{h.shares.toFixed(4)} sh</span>
              <span style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#909090' }}>cost {fmtPrice(h.costBasis)}</span>
              <span style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#909090' }}>val {h.currentValue > 0 ? fmtPrice(h.currentValue) : '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stock Portfolio Detail (collapsible) ─────────────────────
function StockPortfolioDetail({ data, onDataLoad, refreshing, onRefresh }: { data: any; onDataLoad: (d: any) => void; refreshing: boolean; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editPosition, setEditPosition] = useState<any>(null)
  const [editForm, setEditForm] = useState({ shares: '', cost_basis: '', bucket: 'AI Core', dip_trigger: '', target_allocation: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ ticker: '', shares: '', cost_basis: '', bucket: 'AI Core', dip_trigger: '', target_allocation: '' })
  const [warChestInput, setWarChestInput] = useState('0')

  useEffect(() => {
    if (data?.warChest !== undefined) setWarChestInput(data.warChest.toString())
  }, [data?.warChest])

  async function savePosition() {
    if (!editPosition) return
    await fetch('/api/stocks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'position', ticker: editPosition.ticker, shares: parseFloat(editForm.shares), cost_basis: parseFloat(editForm.cost_basis), bucket: editForm.bucket, dip_trigger: editForm.dip_trigger ? parseFloat(editForm.dip_trigger) : null, target_allocation: editForm.target_allocation ? parseFloat(editForm.target_allocation) : null }) })
    const res = await fetch('/api/stocks').then(r => r.json())
    onDataLoad(res); setEditPosition(null)
  }

  async function addPosition() {
    if (!addForm.ticker) return
    await fetch('/api/stocks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'position', ticker: addForm.ticker.toUpperCase(), shares: parseFloat(addForm.shares) || 0, cost_basis: parseFloat(addForm.cost_basis) || 0, bucket: addForm.bucket, dip_trigger: addForm.dip_trigger ? parseFloat(addForm.dip_trigger) : null, target_allocation: addForm.target_allocation ? parseFloat(addForm.target_allocation) : null }) })
    const res = await fetch('/api/stocks?refresh=true').then(r => r.json())
    onDataLoad(res); setShowAdd(false)
    setAddForm({ ticker: '', shares: '', cost_basis: '', bucket: 'AI Core', dip_trigger: '', target_allocation: '' })
  }

  async function deleteTicker(ticker: string) {
    if (!confirm(`Remove ${ticker}?`)) return
    await fetch(`/api/stocks?ticker=${ticker}`, { method: 'DELETE' })
    const res = await fetch('/api/stocks').then(r => r.json())
    onDataLoad(res)
  }

  const [warChestSaved, setWarChestSaved] = useState(false)

  async function saveWarChest() {
    const res = await fetch('/api/stocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'war_chest', war_chest: parseFloat(warChestInput) || 0 }) })
    const json = await res.json()
    if (res.ok && json.success) {
      setWarChestSaved(true)
      setTimeout(() => setWarChestSaved(false), 2000)
      const fresh = await fetch('/api/stocks').then(r => r.json())
      onDataLoad(fresh)
    } else {
      alert('Error saving war chest: ' + (json.error ?? res.status))
    }
  }

  if (!data) return null

  const inputStyle = { background: '#4e4e4e', border: '0.5px solid #363636', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#f0f0f0', outline: 'none', width: '100%', fontFamily: 'DM Mono, monospace' }
  const labelStyle = { fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#c0c0c0', fontFamily: 'DM Mono, monospace', marginBottom: '4px' }

  return (
    <div style={{ background: '#444444', border: '1px solid #242424', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', borderBottom: expanded ? '0.5px solid #242424' : 'none' }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>Portfolio detail</span>
          <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'DM Mono, monospace', color: '#f0f0f0' }}>{fmtCompact(data.totalValue)}</span>
          <span style={{ fontSize: '12px', fontFamily: 'DM Mono, monospace', color: data.totalGainLoss >= 0 ? '#3ddc84' : '#ff6b6b' }}>
            {data.totalGainLoss >= 0 ? '+' : ''}{fmtCompact(data.totalGainLoss)} total
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={e => { e.stopPropagation(); onRefresh() }} disabled={refreshing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0c0c0', padding: 0 }}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {expanded ? <ChevronUp size={14} color="#505050" /> : <ChevronDown size={14} color="#505050" />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 0 8px 0' }}>
          {/* Add button */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #242424', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(s => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#c0c0c0', background: 'none', border: '0.5px solid #363636', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
              <Plus size={10} /> Add ticker
            </button>
          </div>

          {/* Add form */}
          {showAdd && (
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #242424', background: '#4e4e4e', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[['Ticker', 'ticker', 'NVDA'], ['Shares', 'shares', '0'], ['Cost basis', 'cost_basis', '0.00']].map(([label, key, ph]) => (
                  <div key={key}><div style={labelStyle}>{label}</div>
                    <input value={(addForm as any)[key]} placeholder={ph}
                      onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))}
                      style={inputStyle} /></div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addPosition} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', background: '#f0f0f0', color: '#686868', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Add</button>
                <button onClick={() => setShowAdd(false)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', background: 'transparent', color: '#c0c0c0', border: '0.5px solid #363636', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Holdings table */}
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #242424' }}>
                {['Ticker', 'Thesis', 'Price', 'Value', 'Unrealized G/L', 'Day', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === '' ? 'center' : 'left', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.holdings?.map((h: any, i: number) => (
                <tr key={h.ticker} style={{ borderBottom: i < data.holdings.length - 1 ? '0.5px solid #1e1e1e' : 'none', cursor: 'pointer' }}
                  className="hover:bg-surface-3"
                  onClick={() => { setEditPosition(h); setEditForm({ shares: h.shares.toString(), cost_basis: h.costBasis.toString(), bucket: h.bucket, dip_trigger: h.dipTrigger?.toString() ?? '', target_allocation: h.targetAllocation?.toString() ?? '' }) }}>
                  <td style={{ padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontWeight: 500, color: '#f0f0f0' }}>{h.ticker}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: (BUCKET_COLORS[h.bucket] ?? '#888') + '20', color: BUCKET_COLORS[h.bucket] ?? '#888' }}>{h.bucket ?? '—'}</span>
                  </td>
                  <td style={{ padding: '9px 12px', fontFamily: 'DM Mono, monospace', color: '#c0c0c0' }}>{fmtPrice(h.currentPrice)}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'DM Mono, monospace', color: '#f0f0f0', fontWeight: 500 }}>{h.currentValue > 0 ? fmtPrice(h.currentValue) : '—'}</td>
                  <td style={{ padding: '9px 12px' }}>
                    {h.shares > 0 && h.costBasis > 0 ? (
                      <div>
                        <div style={{ fontFamily: 'DM Mono, monospace', color: h.gainLoss >= 0 ? '#3ddc84' : '#ff6b6b', fontSize: '12px' }}>{h.gainLoss >= 0 ? '+' : ''}{fmtPrice(h.gainLoss)}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', color: '#909090', fontSize: '10px' }}>{h.gainLossPct.toFixed(1)}%</div>
                      </div>
                    ) : <span style={{ color: '#686868' }}>—</span>}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', fontWeight: 500, padding: '2px 6px', borderRadius: '4px',
                      color: h.dailyChangePct >= 0 ? '#1a7a3c' : '#a32d2d',
                      background: h.dailyChangePct >= 0 ? '#eaf3de' : '#fcebeb' }}>
                      {fmtPct(h.dailyChangePct)}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); deleteTicker(h.ticker) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#303030', padding: 0 }}
                      className="hover:text-accent-red">
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* War chest + dip triggers */}
          <div style={{ padding: '12px 16px', borderTop: '0.5px solid #242424', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={labelStyle}>War chest</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>$</span>
                <input value={warChestInput} onChange={e => setWarChestInput(e.target.value)} style={{ ...inputStyle, width: '110px' }} />
                <button onClick={saveWarChest} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: '#f0f0f0', color: '#3a3a3a', border: 'none', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>Save</button>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', marginTop: '4px', color: warChestSaved ? '#3ddc84' : '#909090' }}>{warChestSaved ? 'Saved ✓' : data.warChest > 0 ? `Current: ${fmtPrice(data.warChest)}` : ''}</div>
            </div>
            <div>
              <div style={labelStyle}>Dip triggers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.holdings?.filter((h: any) => h.dipTrigger).length === 0 && (
                  <span style={{ fontSize: '11px', color: '#909090', fontFamily: 'DM Mono, monospace' }}>Set dip triggers by editing a position</span>
                )}
                {data.holdings?.filter((h: any) => h.dipTrigger).map((h: any) => (
                  <div key={h.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontFamily: 'DM Mono, monospace', fontWeight: 500, color: '#f0f0f0' }}>{h.ticker}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#909090' }}>trigger {fmtPrice(h.dipTrigger)}</span>
                      <span style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', padding: '1px 6px', borderRadius: '4px',
                        color: h.atDip ? '#a32d2d' : '#1a7a3c', background: h.atDip ? '#fcebeb' : '#eaf3de' }}>
                        now {fmtPrice(h.currentPrice)} {h.atDip ? '· BUY' : '· ok'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editPosition && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}
          onClick={() => setEditPosition(null)}>
          <div style={{ background: '#444444', border: '1px solid #242424', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 500, fontFamily: 'DM Mono, monospace', color: '#f0f0f0' }}>{editPosition.ticker}</span>
              <button onClick={() => setEditPosition(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0c0c0', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={labelStyle}>Shares</div>
                <input type="number" value={editForm.shares} onChange={e => setEditForm(p => ({ ...p, shares: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Cost basis (per share)</div>
                <input type="number" value={editForm.cost_basis} onChange={e => setEditForm(p => ({ ...p, cost_basis: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Thesis</div>
                <select value={editForm.bucket} onChange={e => setEditForm(p => ({ ...p, bucket: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  {BUCKETS.map((b: string) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>Dip trigger ($)</div>
                <input type="number" value={editForm.dip_trigger} onChange={e => setEditForm(p => ({ ...p, dip_trigger: e.target.value }))} style={inputStyle} placeholder="e.g. 150.00" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={savePosition} style={{ flex: 1, fontSize: '13px', padding: '8px', borderRadius: '8px', background: '#f0f0f0', color: '#686868', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Save</button>
              <button onClick={() => setEditPosition(null)} style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px', background: 'transparent', color: '#c0c0c0', border: '0.5px solid #363636', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Manual Accounts (collapsible) ───────────────────────────
function ManualAccountsSection({ onTotalChange }: { onTotalChange: (n: number) => void }) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [expanded, setExpanded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editAccount, setEditAccount] = useState<any>(null)
  const [form, setForm] = useState({ name: '', account_type: 'Real Estate', balance: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/finance/manual').then(r => r.json()).then(res => {
      const data = res.data ?? []
      setAccounts(data)
      onTotalChange(data.reduce((s: number, a: any) => s + a.balance, 0))
    })
  }, [])

  function updateTotal(updated: any[]) { setAccounts(updated); onTotalChange(updated.reduce((s, a) => s + a.balance, 0)) }

  async function save() {
    setSaving(true)
    if (editAccount) {
      const res = await fetch('/api/finance/manual', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editAccount.id, ...form, balance: parseFloat(form.balance) }) }).then(r => r.json())
      if (res.data) updateTotal(accounts.map(a => a.id === res.data.id ? res.data : a))
      setEditAccount(null)
    } else {
      const res = await fetch('/api/finance/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, balance: parseFloat(form.balance) }) }).then(r => r.json())
      if (res.data) updateTotal([...accounts, res.data])
      setShowAdd(false)
    }
    setForm({ name: '', account_type: 'Real Estate', balance: '' }); setSaving(false)
  }

  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const inputStyle = { background: '#4e4e4e', border: '0.5px solid #363636', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#f0f0f0', outline: 'none', width: '100%' }

  return (
    <div style={{ background: '#444444', border: '1px solid #242424', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>Investment accounts</span>
          {total > 0 && <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'DM Mono, monospace', color: '#f5a623' }}>{fmtCompact(total)}</span>}
        </div>
        {expanded ? <ChevronUp size={14} color="#505050" /> : <ChevronDown size={14} color="#505050" />}
      </div>

      {expanded && (
        <div style={{ borderTop: '0.5px solid #242424' }}>
          {accounts.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < accounts.length - 1 ? '0.5px solid #1e1e1e' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f5a623' }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#f0f0f0' }}>{a.name}</div>
                  <div style={{ fontSize: '11px', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>{a.account_type}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontFamily: 'DM Mono, monospace', fontWeight: 500, color: '#f5a623' }}>{fmtCompact(a.balance)}</span>
                <button onClick={() => { setEditAccount(a); setShowAdd(false); setForm({ name: a.name, account_type: a.account_type, balance: a.balance.toString() }) }}
                  style={{ fontSize: '11px', color: '#c0c0c0', background: 'none', border: 'none', cursor: 'pointer' }}>edit</button>
                <button onClick={async () => { await fetch(`/api/finance/manual?id=${a.id}`, { method: 'DELETE' }); updateTotal(accounts.filter(x => x.id !== a.id)) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#303030', padding: 0 }}>
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}

          <div style={{ padding: '10px 16px', borderTop: accounts.length > 0 ? '0.5px solid #242424' : 'none' }}>
            {!(showAdd || editAccount) ? (
              <button onClick={() => { setShowAdd(true); setEditAccount(null); setForm({ name: '', account_type: 'Real Estate', balance: '' }) }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#c0c0c0', background: 'none', border: '0.5px solid #363636', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                <Plus size={10} /> Add account
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c0c0c0', marginBottom: '4px' }}>Name</div>
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Fundrise" style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c0c0c0', marginBottom: '4px' }}>Type</div>
                    <select value={form.account_type} onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))} style={inputStyle}>
                      {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c0c0c0', marginBottom: '4px' }}>Amount ($)</div>
                    <input type="number" value={form.balance} onChange={e => setForm(p => ({ ...p, balance: e.target.value }))} placeholder="0" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={save} disabled={saving || !form.name || !form.balance} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', background: '#f0f0f0', color: '#686868', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                    {saving ? 'Saving...' : editAccount ? 'Update' : 'Add'}
                  </button>
                  <button onClick={() => { setShowAdd(false); setEditAccount(null) }} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', background: 'transparent', color: '#c0c0c0', border: '0.5px solid #363636', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Bank Accounts ────────────────────────────────────────────
function BankAccounts({ finance, isConnected, onConnect, linking }: { finance: any; isConnected: boolean; onConnect: () => void; linking: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ background: '#444444', border: '1px solid #242424', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>Bank accounts</span>
          {finance?.total_cash > 0 && <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'DM Mono, monospace', color: '#3ddc84' }}>{fmtCompact(finance.total_cash)}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={e => { e.stopPropagation(); onConnect() }} disabled={linking}
            style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: '0.5px solid #363636', background: 'transparent', color: '#c0c0c0', cursor: 'pointer' }}>
            {linking ? 'Connecting...' : isConnected ? '+ add' : 'Connect Plaid'}
          </button>
          {expanded ? <ChevronUp size={14} color="#505050" /> : <ChevronDown size={14} color="#505050" />}
        </div>
      </div>

      {expanded && finance?.accounts && (
        <div style={{ borderTop: '0.5px solid #242424' }}>
          {finance.accounts.map((a: any, i: number) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < finance.accounts.length - 1 ? '0.5px solid #1e1e1e' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: TYPE_COLOR[a.type] ?? '#888', boxShadow: `0 0 5px ${(TYPE_COLOR[a.type] ?? '#888')}60` }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#f0f0f0' }}>{a.name}</div>
                  <div style={{ fontSize: '11px', color: '#c0c0c0', fontFamily: 'DM Mono, monospace' }}>{TYPE_LABEL[a.type] ?? a.type} · ••{a.mask}</div>
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'DM Mono, monospace', color: a.type === 'credit' ? '#ff6b6b' : '#f0f0f0' }}>{fmt(a.balance)}</div>
            </div>
          ))}
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
  const [manualAccounts, setManualAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('6m')

  useEffect(() => {
    Promise.all([
      isConnected ? fetch('/api/finance').then(r => r.json()) : Promise.resolve(null),
      fetch('/api/stocks').then(r => r.json()),
      fetch('/api/finance/manual').then(r => r.json()),
    ]).then(([fin, stocks, manual]) => {
      if (fin?.data) setFinanceData(fin.data)
      if (stocks?.holdings) setPortfolioData(stocks)
      const accts = manual?.data ?? []
      setManualAccounts(accts)
      setManualTotal(accts.reduce((s: number, a: any) => s + a.balance, 0))
    }).finally(() => setLoading(false))
  }, [isConnected])

  async function refreshStocks() {
    setRefreshing(true)
    const res = await fetch('/api/stocks?refresh=true').then(r => r.json())
    setPortfolioData(res)
    setRefreshing(false)
  }

  async function openPlaidLink() {
    setLinking(true); setError(null)
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
          const res = await fetch('/api/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_token }) }).then(r => r.json())
          if (res.error) throw new Error(res.error)
          const fresh = await fetch('/api/finance').then(r => r.json())
          if (fresh.data) setFinanceData(fresh.data)
          setLinking(false)
        },
        onExit: () => setLinking(false),
      })
      handler.open()
    } catch (err: any) { setError(err.message); setLinking(false) }
  }

  const netWorth = (financeData ? financeData.net_worth : 0) + (portfolioData?.totalValue ?? 0) + manualTotal
  const holdings = portfolioData?.holdings ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '1400px', paddingBottom: '32px' }}>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px' }}>
        {/* Net worth hero */}
        <div style={{ background: '#444444', border: '1px solid #242424', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0c0c0', fontFamily: 'DM Mono, monospace', marginBottom: '6px' }}>Net worth</div>
          <div style={{ fontSize: '32px', fontWeight: 300, fontFamily: 'DM Mono, monospace', color: '#f0f0f0', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {loading ? '—' : fmtCompact(netWorth)}
          </div>
        </div>
        {/* Mini KPIs */}
        {[
          { label: 'Invested', value: financeData ? fmtCompact(financeData.total_investments + (portfolioData?.totalValue ?? 0)) : '—', color: '#4d9fff' },
          { label: 'Cash', value: financeData ? fmtCompact(financeData.total_cash) : '—', color: '#3ddc84' },
          { label: 'Credit', value: financeData ? fmtCompact(financeData.total_credit_balance) : '—', color: '#ff6b6b' },
        ].map(k => (
          <div key={k.label} style={{ background: '#444444', border: '1px solid #242424', borderRadius: '12px', padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0c0c0', fontFamily: 'DM Mono, monospace', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 300, fontFamily: 'DM Mono, monospace', color: k.color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Main 2-col ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <SpendingChart period={period} onPeriodChange={setPeriod} />
        <AccountGroups finance={financeData} manualAccounts={manualAccounts} portfolio={portfolioData} />
      </div>

      {/* ── Bottom 2-col ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <SpendingCategories />
        <EquityPerformance holdings={holdings} refreshing={refreshing} onRefresh={refreshStocks} onPositionAdded={refreshStocks} />
      </div>

      {/* ── Collapsible detail sections ── */}
      <StockPortfolioDetail data={portfolioData} onDataLoad={setPortfolioData} refreshing={refreshing} onRefresh={refreshStocks} />
      <ManualAccountsSection onTotalChange={t => { setManualTotal(t) }} />
      <BankAccounts finance={financeData} isConnected={isConnected} onConnect={openPlaidLink} linking={linking} />

      {error && <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', fontSize: '13px', color: '#ff6b6b', fontFamily: 'DM Mono, monospace' }}>{error}</div>}
    </div>
  )
}
