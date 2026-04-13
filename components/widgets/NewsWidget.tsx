'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton } from './WidgetCard'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw } from 'lucide-react'

type Tab = 'feed' | 'market'

const TICKER_COLORS: Record<string, string> = {
  NVDA: '#76b900', AVGO: '#cc0000', AMZN: '#ff9900', GOOGL: '#4285f4',
  VST: '#f59e0b', XOM: '#ef4444', CVX: '#3b82f6', CEG: '#8b5cf6',
  KNF: '#10b981', IRDM: '#6366f1',
}

function tickerColor(ticker: string) {
  return TICKER_COLORS[ticker] ?? '#888'
}

export function NewsWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<Tab>('feed')

  async function load() {
    const res = await fetch('/api/news').then(r => r.json())
    setData(res.data)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function refresh() {
    setRefreshing(true)
    // Bust cache
    await fetch('/api/news?refresh=true')
    await load()
    setRefreshing(false)
  }

  const feedItems = data?.feedItems ?? data?.items ?? []
  const marketItems = data?.marketItems ?? []

  const action = (
    <div className="flex items-center gap-2">
      <button onClick={refresh} className="text-text-tertiary hover:text-text-secondary transition-colors">
        <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
      </button>
    </div>
  )

  return (
    <WidgetCard label="News" action={action} accent="purple">
      {loading && <WidgetSkeleton rows={5} />}
      {!loading && (
        <div className="flex flex-col gap-2 h-full">
          {/* Tabs */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setTab('feed')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors
                ${tab === 'feed' ? 'bg-surface-3 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              For You {feedItems.length > 0 && <span className="text-text-dim ml-1">{feedItems.length}</span>}
            </button>
            <button
              onClick={() => setTab('market')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors
                ${tab === 'market' ? 'bg-surface-3 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              Markets {marketItems.length > 0 && <span className="text-text-dim ml-1">{marketItems.length}</span>}
            </button>
          </div>

          {/* Feed tab */}
          {tab === 'feed' && (
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-0.5">
              {feedItems.length === 0 && (
                <div className="flex flex-col gap-1">
                  <span className="widget-empty">No feeds configured</span>
                  <a href="/settings" className="btn-connect w-fit">add feeds in settings</a>
                </div>
              )}
              {feedItems.map((item: any) => (
                <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
                  className="group flex flex-col gap-0.5 py-1.5 px-2 rounded-md hover:bg-surface-3 transition-colors">
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors leading-snug">
                    {item.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-tertiary font-mono">{item.source}</span>
                    <span className="text-[10px] text-text-dim">
                      {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Markets tab */}
          {tab === 'market' && (
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-0.5">
              {marketItems.length === 0 && (
                <div className="flex flex-col gap-1">
                  <span className="widget-empty">No holdings found</span>
                  <a href="/finances" className="btn-connect w-fit">add stocks in finances</a>
                </div>
              )}
              {marketItems.map((item: any) => (
                <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
                  className="group flex flex-col gap-0.5 py-1.5 px-2 rounded-md hover:bg-surface-3 transition-colors">
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors leading-snug">
                    {item.title}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: tickerColor(item.ticker) + '22', color: tickerColor(item.ticker) }}
                    >
                      {item.ticker}
                    </span>
                    {item.sentimentLabel && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                        item.sentimentLabel?.includes('Bullish') ? 'bg-accent/10 text-accent' :
                        item.sentimentLabel?.includes('Bearish') ? 'bg-accent-red/10 text-accent-red' :
                        'bg-surface-3 text-text-tertiary'
                      }`}>
                        {item.sentimentLabel}
                      </span>
                    )}
                    <span className="text-[10px] text-text-tertiary font-mono">{item.source}</span>
                    <span className="text-[10px] text-text-dim">
                      {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  )
}
