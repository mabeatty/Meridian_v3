import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cached } = await supabase.from('widget_cache').select('data,fetched_at').eq('user_id', user.id).eq('widget_key', 'weather').single()
  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 30) {
    return NextResponse.json({ data: cached.data, cached: true })
  }

  const { data: profile } = await supabase.from('profiles').select('location_lat,location_lng,location_name').eq('id', user.id).single()
  const lat = profile?.location_lat ?? 41.8781
  const lng = profile?.location_lng ?? -87.6298
  const locationName = profile?.location_name ?? 'Chicago'
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Weather API not configured' }, { status: 503 })

  try {
    const [cr, fr] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial&cnt=8`),
    ])
    const [c, f] = await Promise.all([cr.json(), fr.json()])
    const data = {
      temp: c.main.temp, feels_like: c.main.feels_like, condition: c.weather[0].main,
      description: c.weather[0].description, icon: c.weather[0].icon,
      humidity: c.main.humidity, wind_speed: c.wind.speed, location: locationName,
      high: c.main.temp_max, low: c.main.temp_min,
      hourly: f.list.slice(0, 8).map((h: any) => ({ time: new Date(h.dt * 1000).toISOString(), temp: h.main.temp, icon: h.weather[0].icon, condition: h.weather[0].main })),
      fetched_at: new Date().toISOString(),
    }
    await supabase.from('widget_cache').upsert({ user_id: user.id, widget_key: 'weather', data, fetched_at: data.fetched_at }, { onConflict: 'user_id,widget_key' })
    return NextResponse.json({ data, cached: false })
  } catch { return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 }) }
}
