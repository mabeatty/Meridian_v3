'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton } from './WidgetCard'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw } from 'lucide-react'

export function NewsWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const res = await fetch('/api/news').then(r => r.json())
    setData(res.data)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function refresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <WidgetCard label="News" action={<button onClick={refresh} className="text-text-tertiary hover:text-text-secondary transition-colors"><RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /></button>}>
      {loading && <WidgetSkeleton rows={5} />}
      {!loading && data && (
        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
          {data.items.length === 0 && (
            <div className="flex flex-col gap-1">
              <span className="widget-empty">No feeds configured</span>
              <a href="/settings" className="btn-connect w-fit">add feeds in settings</a>
            </div>
          )}
          {data.items.map((item: any) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
              className="group flex flex-col gap-0.5 py-1.5 px-2 rounded-md hover:bg-surface-3 transition-colors">
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors leading-snug">{item.title}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-tertiary font-mono">{item.source}</span>
                <span className="text-[10px] text-text-dim">{formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
