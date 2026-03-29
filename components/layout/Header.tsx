'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface HeaderProps {
  displayName?: string | null
  weather?: { temp: number; condition: string; location: string } | null
}

function getGreeting(h: number) {
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export function Header({ displayName, weather }: HeaderProps) {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const i = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  return (
    <header className="flex items-start justify-between px-8 py-5 border-b border-border bg-surface">
      <div>
        <h2 className="text-2xl font-medium text-text-primary tracking-tight">
        {time ? getGreeting(time.getHours()) : 'Hello'}, {displayName || 'Alex'}.
        </h2>
        <p className="text-text-secondary text-sm mt-0.5">{time ? format(time as Date, 'EEEE, MMMM d') : ''}</p>
      </div>
      <div className="flex items-start gap-8">
        <div className="text-right">
          <div className="font-clock text-3xl font-light text-text-primary tabular-nums tracking-tight">
          {time ? format(time as Date, 'h:mm:ss') : '--:--:--'}{' '}
          <span className="text-lg text-text-secondary">{time ? format(time as Date, 'aa').toUpperCase() : ''}</span>
          </div>
        </div>
        {weather ? (
          <div className="text-right min-w-[80px]">
            <div className="text-2xl font-light text-text-primary">{Math.round(weather.temp)}°F</div>
            <div className="text-xs text-text-secondary mt-0.5">{weather.condition} · {weather.location}</div>
          </div>
        ) : (
          <div className="text-right min-w-[80px]">
            <div className="text-2xl font-light text-text-tertiary">--°F</div>
          </div>
        )}
      </div>
    </header>
  )
}
