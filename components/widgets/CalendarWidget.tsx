'use client'
import { useEffect, useState } from 'react'
import { WidgetCard, WidgetSkeleton, ConnectPrompt } from './WidgetCard'
import { format, parseISO } from 'date-fns'
import { ExternalLink } from 'lucide-react'

const COLORS: Record<string, string> = {
  '1':'#7986CB','2':'#33B679','3':'#8E24AA','4':'#E67C73',
  '5':'#F6BF26','6':'#F4511E','7':'#039BE5','11':'#D50000',
}

export function CalendarWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notConnected, setNotConnected] = useState(false)

  useEffect(() => {
    fetch('/api/calendar').then(r => r.json()).then(res => {
      if (res.error === 'not_connected') { setNotConnected(true); return }
      setData(res.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <WidgetCard label="Calendar" accent="blue">
      {loading && <WidgetSkeleton rows={3} />}
      {!loading && notConnected && <ConnectPrompt service="Google Calendar" href="/api/auth/google" label="events" />}
      {!loading && !notConnected && data && (
        <div className="flex flex-col gap-1">
          {data.events.length === 0 && <span className="widget-empty">No events today</span>}
          {data.events.map((ev: any) => (
            <div key={ev.id} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-md hover:bg-surface-3 transition-colors ${new Date(ev.end) < new Date() ? 'opacity-40' : ''}`}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ev.colorId ? COLORS[ev.colorId] : '#60a5fa' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-text-primary truncate">{ev.title}</span>
                  {ev.htmlLink && <a href={ev.htmlLink} target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-text-secondary flex-shrink-0"><ExternalLink size={10} /></a>}
                </div>
                <span className="text-xs text-text-tertiary font-mono">
                  {format(parseISO(ev.start), 'EEE MMM d')} · {ev.allDay ? 'All day' : `${format(parseISO(ev.start), 'h:mm a')} – ${format(parseISO(ev.end), 'h:mm a')}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
