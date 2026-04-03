'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// ─── Formatters ───────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(n)

const fmtPrice = (n: number) => n.toLocaleString('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 2, maximumFractionDigits: 2
})

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

const TYPE_LABEL: Record<string, string> = {
  depository: 'Cash', investment: 'Investment', credit: 'Credit', loan: 'Loan',
}

const TYPE_COLOR: Record<string, string> = {
  depository: '#4ade80', investment: '#60a5fa', credit: '#f87171', loan: '#fbbf24',
}

const BUCKET_COLORS: Record<string, string> = {
  'AI Core': '#60a5fa', 'Energy': '#4ade80', 'Nuclear': '#a78bfa', 'Obscure': '#fbbf24',
}

const ACCOUNT_TYPES = ['Real Estate', 'Private Equity', 'Venture', 'Angel', 'Debt', 'Other']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-2 border border-border rounded-md px-3 py-2 text-xs">
      <div className="text-text-tertiary mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(p.value)}
        </div>
      ))}
    </div>
  )
}

// ─── KPI Bar ──────────────────────────────────────────────────
function KPIBar({ finance, portfolio, manualTotal }: {
  finance: any
  portfolio: any
  manualTotal: number
}) {
  const netWorth = finance
    ? finance.net_worth + (portfolio?.totalValue ?? 0) + manualTotal
    : null

  const kpis = [
    {
      label: 'Net Worth',
      value: netWorth != null ? fmt(netWorth) : '—',
      color: 'text-text-primary',
      sub: null,
    },
    {
      label: 'Invested',
      value: finance ? fmt(finance.total_investments) : '—',
      color: 'text-accent-blue',
      sub: null,
    },
    {
      label: 'Cash',
      value: finance ? fmt(finance.total_cash) : '—',
      color: 'text-accent',
      sub: null,
    },
    {
      label: 'Credit',
      value: finance ? fmt(finance.total_credit_balance) : '—',
      color: 'text-accent-red',
      sub: null,
    },
    {
      label: 'Portfolio',
      value: portfolio ? fmt(portfolio.totalValue) : '—',
      color: 'text-accent-blue',
      sub: portfolio ? (
        <span className={`text-[10px] font-mono ${portfolio.totalGainLoss >= 0 ? 'text-accent' : 'text-accent-red'}`}>
          {portfolio.totalGainLoss >= 0 ? '+' : ''}{fmt(portfolio.totalGainLoss)}
        </span>
      ) : null,
    },
  ]

  return (
    <div className="grid grid-cols-5 gap-3">
      {kpis.map(k => (
        <div key={k.label} className="bg-surface-2 border border-border rounded-lg px-4 py-3">
          <div className={`text-xl font-light font-mono tracking-tight ${k.color}`}>{k.value}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{k.label}</span>
            {k.sub}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Stock Portfolio ──────────────────────────────────────────
function StockPortfolio({ onDataLoad }: { onDataLoad: (d: any) => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editPosition, setEditPosition] = useState<any>(null)
  const [editForm, setEditForm] = useState({ shares: '', cost_basis: '' })
  const [warChestInput, setWarChestInput] = useState('0')
  const [savingWarChest, setSavingWarChest] = useState(false)

  useEffect(() => {
    fetch('/api/stocks')
      .then(r => r.json())
      .then(res => {
        setData(res)
        onDataLoad(res)
        setWarChestInput(res.warChest?.toString() ?? '0')
      })
      .finally(() => setLoading(false))
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
      }),
    })
    const res = await fetch('/api/stocks').then(r => r.json())
    setData(res)
    onDataLoad(res)
    setEditPosition(null)
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

  if (loading) return (
    <>
      <div className="bg-surface-2 border border-border rounded-lg p-6">
        <div className="text-xs text-text-tertiary animate-pulse">Loading live prices...</div>
      </div>
      <div className="bg-surface-2 border border-border rounded-lg p-6" />
      <div className="bg-surface-2 border border-border rounded-lg p-6" />
    </>
  )

  if (!data) return null

  const topMover = [...data.holdings].sort((a: any, b: any) =>
    Math.abs(b.dailyChangePct) - Math.abs(a.dailyChangePct)
  )[0]

  const dailyPnL = data.holdings.reduce((s: number, h: any) =>
    s + (h.shares * h.dailyChange), 0
  )

  return (
    <>
      {/* Left — Portfolio summary */}
      <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="widget-label">Portfolio</span>
          <button onClick={refresh} disabled={refreshing}
            className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors">
            {refreshing ? 'refreshing...' : 'refresh'}
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-light font-mono text-text-primary">{fmt(data.totalValue)}</div>
          <div className={`text-sm font-mono ${data.totalGainLoss >= 0 ? 'text-accent' : 'text-accent-red'}`}>
            {data.totalGainLoss >= 0 ? '+' : ''}{fmt(data.totalGainLoss)}
            <span className="text-text-tertiary text-xs ml-1">total</span>
          </div>
          <div className={`text-sm font-mono ${dailyPnL >= 0 ? 'text-accent' : 'text-accent-red'}`}>
            {dailyPnL >= 0 ? '+' : ''}{fmt(dailyPnL)}
            <span className="text-text-tertiary text-xs ml-1">today</span>
          </div>
        </div>
        {topMover && (
          <div className="bg-surface-3 rounded-md p-3">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Top mover</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-semibold text-text-primary">{topMover.ticker}</span>
              <span className={`text-sm font-mono ${topMover.dailyChangePct >= 0 ? 'text-accent' : 'text-accent-red'}`}>
                {fmtPct(topMover.dailyChangePct)}
              </span>
            </div>
          </div>
        )}
        <div className="text-[10px] text-text-dim font-mono border-t border-border pt-2">
          {data.pricesUpdatedAt ? `Updated ${new Date(data.pricesUpdatedAt).toLocaleTimeString()}` : ''}
        </div>
      </div>

      {/* Center — Holdings table */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border widget-label">Holdings</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Ticker', 'Bucket', 'Shares', 'Cost', 'Price', 'Value', 'Gain/Loss', 'Day'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.holdings.map((h: any) => (
              <tr key={h.ticker}
                className="border-b border-border last:border-0 hover:bg-surface-3 transition-colors cursor-pointer"
                onClick={() => {
                  setEditPosition(h)
                  setEditForm({ shares: h.shares.toString(), cost_basis: h.costBasis.toString() })
                }}>
                <td className="px-3 py-2.5 font-mono font-semibold text-text-primary">{h.ticker}</td>
                <td className="px-3 py-2.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: BUCKET_COLORS[h.bucket] + '22', color: BUCKET_COLORS[h.bucket] }}>
                    {h.bucket}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-text-secondary">{h.shares || '—'}</td>
                <td className="px-3 py-2.5 font-mono text-text-secondary">{h.costBasis ? fmtPrice(h.costBasis) : '—'}</td>
                <td className="px-3 py-2.5 font-mono text-text-primary">{fmtPrice(h.currentPrice)}</td>
                <td className="px-3 py-2.5 font-mono text-text-primary">{h.currentValue > 0 ? fmt(h.currentValue) : '—'}</td>
                <td className="px-3 py-2.5">
                  {h.shares > 0 ? (
                    <div>
                      <div className={`font-mono ${h.gainLoss >= 0 ? 'text-accent' : 'text-accent-red'}`}>
                        {h.gainLoss >= 0 ? '+' : ''}{fmt(h.gainLoss)}
                      </div>
                      <div className={`text-[10px] font-mono ${h.gainLossPct >= 0 ? 'text-accent' : 'text-accent-red'}`}>
                        {fmtPct(h.gainLossPct)}
                      </div>
                    </div>
                  ) : <span className="text-text-dim">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`font-mono font-medium ${h.dailyChangePct >= 0 ? 'text-accent' : 'text-accent-red'}`}>
                    {fmtPct(h.dailyChangePct)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-border">
          <span className="text-[10px] text-text-dim">Click any row to edit position</span>
        </div>
      </div>

      {/* Right — Allocation + War chest */}
      <div className="flex flex-col gap-4">
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          <span className="widget-label">Allocation vs target</span>
          {data.allocations.map((a: any) => (
            <div key={a.bucket} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">{a.bucket}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-dim">target {a.target}%</span>
                  <span className="text-[10px] font-mono font-medium"
                    style={{
                      color: Math.abs(a.current - a.target) <= 2 ? '#4ade80'
                        : Math.abs(a.current - a.target) <= 5 ? '#fbbf24' : '#f87171'
                    }}>
                    {a.current.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="relative h-2 bg-surface-3 rounded-full overflow-hidden">
                <div className="absolute top-0 bottom-0 w-px bg-[#444] z-10"
                  style={{ left: `${Math.min(a.target, 99)}%` }} />
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(a.current, 100)}%`,
                    backgroundColor: Math.abs(a.current - a.target) <= 2 ? '#4ade80'
                      : Math.abs(a.current - a.target) <= 5 ? '#fbbf24' : '#f87171'
                  }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          <span className="widget-label">War chest</span>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Available cash</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-tertiary">$</span>
              <input
                value={warChestInput}
                onChange={e => setWarChestInput(e.target.value)}
                onBlur={saveWarChest}
                disabled={savingWarChest}
                className="w-24 bg-surface-3 border border-border rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none text-right"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Dip triggers</span>
            {data.holdings.filter((h: any) => h.dipTrigger).map((h: any) => (
              <div key={h.ticker} className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-text-primary">{h.ticker}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-tertiary">≤{fmtPrice(h.dipTrigger)}</span>
                  <span className={`text-[10px] font-mono font-semibold ${h.atDip ? 'text-accent-red' : 'text-accent'}`}>
                    {fmtPrice(h.currentPrice)} {h.atDip ? '🔴 BUY' : '✓'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit position modal */}
      {editPosition && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setEditPosition(null)}>
          <div className="bg-surface-2 border border-border rounded-xl p-6 w-full max-w-sm flex flex-col gap-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-text-primary font-medium">{editPosition.ticker}</h3>
                <p className="text-text-tertiary text-xs mt-0.5">{editPosition.bucket}</p>
              </div>
              <button onClick={() => setEditPosition(null)} className="text-text-tertiary text-lg">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="widget-label">Shares</label>
                <input type="number" value={editForm.shares}
                  onChange={e => setEditForm(p => ({ ...p, shares: e.target.value }))}
                  className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none font-mono"
                  placeholder="0" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="widget-label">Cost basis (per share)</label>
                <input type="number" value={editForm.cost_basis}
                  onChange={e => setEditForm(p => ({ ...p, cost_basis: e.target.value }))}
                  className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none font-mono"
                  placeholder="0.00" />
              </div>
            </div>
            <div className="bg-surface-3 rounded-md p-3 text-xs font-mono text-text-secondary">
              {editForm.shares && editForm.cost_basis
                ? `Value: ${fmt(parseFloat(editForm.shares) * editPosition.currentPrice)} · Cost: ${fmt(parseFloat(editForm.shares) * parseFloat(editForm.cost_basis))}`
                : `Current price: ${fmtPrice(editPosition.currentPrice)}`}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={savePosition} className="btn-primary flex-1">Save position</button>
              <button onClick={() => setEditPosition(null)} className="text-xs text-text-tertiary">Cancel</button>
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
    fetch('/api/finance/manual')
      .then(r => r.json())
      .then(res => {
        const data = res.data ?? []
        setAccounts(data)
        onTotalChange(data.reduce((s: number, a: any) => s + a.balance, 0))
      })
      .finally(() => setLoading(false))
  }, [])

  function updateTotal(updated: any[]) {
    setAccounts(updated)
    onTotalChange(updated.reduce((s, a) => s + a.balance, 0))
  }

  async function save() {
    setSaving(true)
    if (editAccount) {
      const res = await fetch('/api/finance/manual', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editAccount.id, ...form, balance: parseFloat(form.balance) }),
      }).then(r => r.json())
      if (res.data) updateTotal(accounts.map(a => a.id === res.data.id ? res.data : a))
      setEditAccount(null)
    } else {
      const res = await fetch('/api/finance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="widget-label">Investment accounts</span>
          {total > 0 && <span className="text-sm font-mono text-accent-amber">{fmt(total)}</span>}
        </div>
        <button
          onClick={() => {
            setShowAdd(true)
            setEditAccount(null)
            setForm({ name: '', account_type: 'Real Estate', balance: '' })
          }}
          className="btn-connect text-[10px] py-1">
          + add
        </button>
      </div>

      {loading && <div className="px-4 py-4 text-xs text-text-tertiary animate-pulse">Loading...</div>}

      {!loading && accounts.length === 0 && !showAdd && (
        <div className="px-4 py-6 text-xs text-text-tertiary text-center">
          No investment accounts yet — click + add to get started
        </div>
      )}

      {accounts.map(account => (
        <div key={account.id}
          className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-accent-amber" />
            <div>
              <div className="text-sm text-text-primary">{account.name}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5">{account.account_type}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-mono text-accent-amber">{fmt(account.balance)}</div>
            <button
              onClick={() => {
                setEditAccount(account)
                setShowAdd(false)
                setForm({ name: account.name, account_type: account.account_type, balance: account.balance.toString() })
              }}
              className="text-[10px] text-text-tertiary hover:text-text-secondary">edit</button>
            <button onClick={() => deleteAccount(account.id)}
              className="text-[10px] text-accent-red hover:text-accent-red/80">✕</button>
          </div>
        </div>
      ))}

      {(showAdd || editAccount) && (
        <div className="px-4 py-4 border-t border-border flex flex-col gap-3 bg-surface-3">
          <span className="widget-label">{editAccount ? 'Edit account' : 'New account'}</span>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="widget-label">Name</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Fundrise Project A"
                className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Type</label>
              <select
                value={form.account_type}
                onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))}
                className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none">
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Amount ($)</label>
              <input
                type="number"
                value={form.balance}
                onChange={e => setForm(p => ({ ...p, balance: e.target.value }))}
                placeholder="0"
                className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving || !form.name || !form.balance} className="btn-primary">
              {saving ? 'Saving...' : editAccount ? 'Update' : 'Add account'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setEditAccount(null) }}
              className="text-xs text-text-tertiary hover:text-text-secondary">cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
interface Props {
  snapshots: any[]
  isConnected: boolean
}

export function FinancesClient({ snapshots, isConnected }: Props) {
  const [financeData, setFinanceData] = useState<any>(null)
  const [portfolioData, setPortfolioData] = useState<any>(null)
  const [manualTotal, setManualTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected) {
      fetch('/api/finance')
        .then(r => r.json())
        .then(res => { if (res.data) setFinanceData(res.data) })
        .finally(() => setLoading(false))
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
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ public_token }),
            }).then(r => r.json())
            if (res.error) throw new Error(res.error)
            // Refresh finance data after each connection
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

  const chartData = [...snapshots].slice(0, 30).reverse().map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    'Net Worth': Math.round(s.net_worth),
    'Cash': Math.round(s.total_cash),
    'Invested': Math.round(s.total_investments),
  }))

  return (
    <div className="flex flex-col gap-5 max-w-7xl pb-8">

      {/* KPI bar */}
      <KPIBar finance={financeData} portfolio={portfolioData} manualTotal={manualTotal} />

      {/* Stock portfolio */}
      <div className="grid grid-cols-3 gap-4">
        <StockPortfolio onDataLoad={setPortfolioData} />
      </div>

      {/* Bank accounts */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="widget-label">Bank accounts</span>
          <button onClick={openPlaidLink} disabled={linking} className="btn-connect text-[10px] py-1">
            {linking ? 'Connecting...' : isConnected ? '+ add account' : 'Connect Plaid'}
          </button>
        </div>
        {!isConnected && !financeData ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="text-text-secondary text-sm">Connect your bank accounts</div>
            {error && <div className="text-accent-red text-xs">{error}</div>}
            <button onClick={openPlaidLink} disabled={linking} className="btn-primary">
              {linking ? 'Connecting...' : 'Connect with Plaid'}
            </button>
          </div>
        ) : loading ? (
          <div className="px-4 py-6 text-xs text-text-tertiary animate-pulse">Loading accounts...</div>
        ) : financeData?.accounts ? (
          financeData.accounts.map((account: any) => (
            <div key={account.id}
              className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TYPE_COLOR[account.type] ?? '#888' }} />
                <div>
                  <div className="text-sm text-text-primary">{account.name}</div>
                  <div className="text-[10px] text-text-tertiary font-mono mt-0.5">
                    {TYPE_LABEL[account.type] ?? account.type} · ••{account.mask}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono" style={{ color: TYPE_COLOR[account.type] ?? '#e8e8e8' }}>
                  {fmt(account.balance)}
                </div>
                {account.available_balance !== null && account.available_balance !== account.balance && (
                  <div className="text-[10px] text-text-tertiary font-mono mt-0.5">
                    {fmt(account.available_balance)} available
                  </div>
                )}
              </div>
            </div>
          ))
        ) : null}
      </div>

      {/* Investment accounts */}
      <ManualAccounts onTotalChange={setManualTotal} />

      {/* Net worth trend */}
      {chartData.length > 1 && (
        <div className="bg-surface-2 border border-border rounded-lg p-4">
          <div className="widget-label mb-3">Net worth trend</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#555' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#555' }} tickLine={false} axisLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Net Worth" stroke="#4ade80" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="Cash" stroke="#60a5fa" strokeWidth={1.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="Invested" stroke="#a78bfa" strokeWidth={1.5} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            {[['Net Worth', '#4ade80'], ['Cash', '#60a5fa'], ['Invested', '#a78bfa']].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-text-tertiary">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-md bg-surface-2 border border-accent-red/20 text-sm text-accent-red">
          {error}
        </div>
      )}
    </div>
  )
}