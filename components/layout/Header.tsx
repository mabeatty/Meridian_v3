'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

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

function weatherEmoji(condition: string) {
  const c = condition.toLowerCase()
  if (c.includes('rain') || c.includes('drizzle')) return '🌧'
  if (c.includes('snow')) return '🌨'
  if (c.includes('thunder') || c.includes('storm')) return '⛈'
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog')) return '☁️'
  if (c.includes('clear') || c.includes('sunny')) return '☀️'
  return '🌤'
}

export function Header({ displayName, weather }: HeaderProps) {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const i = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '64px',
      padding: '0 28px',
      borderBottom: '1px solid #525252',
      background: '#3a3a3a',
      flexShrink: 0,
    }}>
      {/* Greeting */}
      <div>
        <h2 style={{
          fontSize: '17px',
          fontWeight: 500,
          color: '#f0f0f0',
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          fontFamily: "'DM Sans', sans-serif",
          margin: 0,
        }}>
          {time ? getGreeting(time.getHours()) : 'Hello'},{' '}
          <span style={{ color: '#c0c0c0' }}>{displayName || 'Alex'}</span>
        </h2>
        <p style={{
          fontSize: '12px',
          color: '#c0c0c0',
          marginTop: '2px',
          fontFamily: "'DM Mono', monospace",
        }}>
          {time ? format(time, 'EEEE, MMMM d') : ''}
        </p>
      </div>

      {/* Right — weather + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {weather && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#f0f0f0', fontFamily: "'DM Mono', monospace" }}>
              {weatherEmoji(weather.condition)} {Math.round(weather.temp)}°F
            </div>
            <div style={{ fontSize: '10px', color: '#c0c0c0', marginTop: '2px', fontFamily: "'DM Mono', monospace" }}>
              {weather.condition}
            </div>
          </div>
        )}
        <div style={{
          textAlign: 'right',
          paddingLeft: '24px',
          borderLeft: '1px solid #525252',
        }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '26px',
            fontWeight: 300,
            color: '#f0f0f0',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {time ? format(time, 'h:mm') : '--:--'}
            <span style={{ fontSize: '16px', color: '#c0c0c0' }}>
              {time ? format(time, ':ss') : ''}
            </span>
            {' '}
            <span style={{ fontSize: '13px', color: '#c0c0c0' }}>
              {time ? format(time, 'aa').toUpperCase() : ''}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
