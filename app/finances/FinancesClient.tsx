'use client'

import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const fmt = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(n)

const TYPE_LABEL: Record<string, string> = {
  depository: 'Cash',
  investment: 'Investment',
  credit: 'Credit',
  loan: 'Loan',
}

const TYPE_COLOR: Record<string, string> = {
  depository: '#4ade80',
  investment: '#60a5fa',
  credit: '#f87171',
  loan: '#fbbf24',
}

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

interface Props {
  snapshots: any[]
  isConnected: boolean
}

export function FinancesClient({ snapshots, isConnected }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadFinanceData() {
    const res = await fetch('/api/finance').then(r => r.json())
    if (res.data) setData(res.data)
    setLoading(false)
  }

  useEffect(() => {
    if (isConnected) loadFinanceData()
    else setLoading(false)
  }, [isConnected])

  async function openPlaidLink() {
    setLinking(true)
    setError(null)
    try {
      // Get link token
      const tokenRes = await fetch('/api/finance/link-token', { method: 'POST' }).then(r => r.json())
      if (tokenRes.error) throw new Error(tokenRes.error)

      // Load Plaid Link script
      await new Promise<void>((resolve, reject) => {
        if ((window as any).Plaid) { resolve(); return }
        const script = document.createElement('script')
        script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Plaid'))
        document.head.appendChild(script)
      })

      // Open Plaid Link
      const handler = (window as any).Plaid.create({
        token: tokenRes.link_token,
        onSuccess: async (public_token: string) => {
          const exchangeRes = await fetch('/api/finance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token }),
          }).then(r => r.json())

          if (exchangeRes.error) throw new Error(exchangeRes.error)
          await loadFinanceData()
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

  // Chart data from snapshots
  const chartData = [...snapshots]
    .slice(0, 30)
    .reverse()
    .map(s => ({
      date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      'Net Worth': Math.round(s.net_worth),
      'Cash': Math.round(s.total_cash),
      'Invested': Math.round(s.total_investments),
    }))

  if (!isConnected && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-text-secondary text-sm">Connect your accounts to see your financial snapshot</div>
        {error && <div className="text-accent-red text-xs">{error}</div>}
        <button onClick={openPlaidLink} disabled={linking} className="btn-primary">
          {linking ? 'Connecting...' : 'Connect accounts with Plaid'}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="max-w-4xl flex flex-col gap-6">

      {/* Net worth headline */}
      {data && (
        <div className="bg-surface-2 border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-light font-mono text-text-primary tracking-tight">
                {fmt(data.net_worth)}
              </div>
              <div className="text-xs text-text-tertiary mt-1 uppercase tracking-wider">Net worth</div>
            </div>
            <button onClick={openPlaidLink} disabled={linking} className="btn-connect">
              {linking ? 'Connecting...' : '+ add account'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-3 rounded-md p-3">
              <div className="text-lg font-mono text-accent">{fmt(data.total_cash)}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5">Cash</div>
            </div>
            <div className="bg-surface-3 rounded-md p-3">
              <div className="text-lg font-mono text-accent-blue">{fmt(data.total_investments)}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5">Invested</div>
            </div>
            <div className="bg-surface-3 rounded-md p-3">
              <div className="text-lg font-mono text-accent-red">{fmt(data.total_credit_balance)}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5">Credit balance</div>
            </div>
          </div>
        </div>
      )}

      {/* Net worth chart */}
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

      {/* Accounts list */}
      {data?.accounts && (
        <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border widget-label">Accounts</div>
          {data.accounts.map((account: any) => (
            <div key={account.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
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
          ))}
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