'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton, ConnectPrompt } from './WidgetCard'

const fmt = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(n)

const TYPE_LABEL: Record<string, string> = {
  depository: 'Cash', investment: 'Invest.', credit: 'Credit', loan: 'Loan'
}

export function FinanceWidget() {
  const [data, setData] = useState<any>(null)
  const [manual, setManual] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notConnected, setNotConnected] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/finance').then(r => r.json()),
      fetch('/api/finance/manual').then(r => r.json()),
    ]).then(([finRes, manRes]) => {
      if (finRes.error === 'not_connected') setNotConnected(true)
      else setData(finRes.data)
      setManual(manRes.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const manualTotal = manual.reduce((s, a) => s + a.balance, 0)
  const stocksTotal = 0 // stocks pulled separately on finances page
  const netWorth = data ? data.net_worth + manualTotal : null

  return (
    <WidgetCard label="Financial Snapshot">
      {loading && <WidgetSkeleton rows={4} />}
      {!loading && notConnected && <ConnectPrompt service="Plaid" href="/settings#plaid" label="accounts" />}
      {!loading && !notConnected && data && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-2xl font-light text-text-primary font-mono tracking-tight">{fmt(netWorth ?? 0)}</div>
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Net worth</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-3 rounded-md p-2">
              <div className="text-sm font-mono text-text-primary">{fmt(data.total_cash)}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5">Cash</div>
            </div>
            <div className="bg-surface-3 rounded-md p-2">
              <div className="text-sm font-mono text-text-primary">{fmt(data.total_investments)}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5">Invested</div>
            </div>
            <div className="bg-surface-3 rounded-md p-2">
              <div className="text-sm font-mono text-accent-red">{fmt(data.total_credit_balance)}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5">Credit</div>
            </div>
          </div>
          {manualTotal > 0 && (
            <div className="bg-surface-3 rounded-md p-2">
              <div className="text-sm font-mono text-accent-amber">{fmt(manualTotal)}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5">Investments</div>
            </div>
          )}
          <div className="flex flex-col divide-y divide-border">
            {data.accounts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-text-tertiary font-mono w-10 flex-shrink-0">{TYPE_LABEL[a.type] ?? a.type}</span>
                  <span className="text-xs text-text-secondary truncate">{a.name}</span>
                  <span className="text-[10px] text-text-dim font-mono">••{a.mask}</span>
                </div>
                <span className={`text-xs font-mono flex-shrink-0 ml-2 ${a.type === 'credit' ? 'text-accent-red' : 'text-text-primary'}`}>
                  {fmt(a.balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  )
}