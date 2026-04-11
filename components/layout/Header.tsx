'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Cloud, Sun, CloudRain, CloudSnow, Zap } from 'lucide-react'

interface HeaderProps {
  displayName?: string | null
  weather?: { temp: number; condition: string; location: string } | null
}

function getGreeting(h: number) {
  if (h < 5)  return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

function WeatherIcon({ condition }: { condition: string }) {
  const c = condition.toLowerCase()
  if (c.includes('rain') || c.includes('drizzle')) return <CloudRain size={14} className="text-accent-blue opacity-70" />
  if (c.includes('snow')) return <CloudSnow size={14} className="text-accent-blue opacity-70" />
  if (c.includes('thunder') || c.includes('storm')) return <Zap size={14} className="text-accent-amber opacity-70" />
  if (c.includes('cloud') || c.includes('overcast')) return <Cloud size={14} className="text-text-tertiary opacity-70" />
  return <Sun size={14} className="text-accent-amber opacity-70" />
}

export function Header({ displayName, weather }: HeaderProps) {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const i = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  return (
    <header className="flex items-center justify-between px-7 py-4 border-b border-border bg-surface-1 flex-shrink-0">
      {/* Left — greeting */}
      <div className="flex flex-col">
        <h2 className="text-[17px] font-medium text-text-primary tracking-tight leading-tight"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {time ? getGreeting(time.getHours()) : 'Hello'},{' '}
          <span className="text-text-secondary">{displayName || 'Alex'}</span>
        </h2>
        <p className="text-text-tertiary text-xs mt-0.5 font-mono">
          {time ? format(time, 'EEEE, MMMM d') : ''}
        </p>
      </div>

      {/* Right — clock + weather */}
      <div className="flex items-center gap-6">
        {weather && (
          <div className="flex items-center gap-2 text-right">
            <WeatherIcon condition={weather.condition} />
            <div>
              <div className="text-sm font-mono text-text-primary leading-none">{Math.round(weather.temp)}°F</div>
              <div className="text-[10px] text-text-tertiary mt-0.5 font-mono">{weather.condition}</div>
            </div>
          </div>
        )}
        <div className="text-right pl-6 border-l border-border">
          <div className="font-clock text-2xl font-light text-text-primary tabular-nums leading-none tracking-tight">
            {time ? format(time, 'h:mm') : '--:--'}
            <span className="text-base text-text-tertiary ml-0.5">{time ? format(time, ':ss') : ''}</span>
            {' '}
            <span className="text-sm text-text-tertiary">{time ? format(time, 'aa').toUpperCase() : ''}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
